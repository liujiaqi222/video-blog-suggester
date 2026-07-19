import { load } from "cheerio";
import { eq } from "drizzle-orm";

import { db } from "@/db/db";
import { chunks, content } from "@/db/schema";
import { batchExec } from "./utils/batchExec";
import { z } from "zod";

const RSS_URL = "https://blog.webdevsimplified.com/rss.xml";
// 控制单批并发抓取数，避免 RSS 有大量历史文章时瞬间发出过多请求。
const BATCH_SIZE = 10;

const articleSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  url: z.url(),
  publishDate: z.coerce.date(),
});

type Article = z.infer<typeof articleSchema>;

export async function ingestWebDevSimplifiedArticles() {
  "use workflow";

  // ── 步骤 1：从 RSS 中找出数据库尚未收录的文章 ─────────────────────────
  console.log("[WebDevSimplified] 开始同步 RSS 文章");
  const articles = await getArticlesMissingFromDatabase();
  console.log("[WebDevSimplified] 找到待入库文章", {
    count: articles.length,
  });

  // ── 步骤 2：按批并发抓取和入库 ──────────────────────────────────────
  // 每批完成后再处理下一批，防止并发请求数量随文章总数无限增长。
  const { failed, results } = await batchExec(articles, ingestArticle, {
    batchSize: BATCH_SIZE,
  });
  const ingested = results.filter((result) => result.ingested).length;

  if (failed > 0) {
    console.error("[WebDevSimplified] 部分文章处理失败", { failed });
  }

  return { discovered: articles.length, ingested };
}

async function getArticlesMissingFromDatabase(): Promise<Article[]> {
  "use step";

  // ── 步骤 1.1：获取并解析 RSS 条目 ──────────────────────────────────
  console.log("[WebDevSimplified] 正在获取 RSS feed", { url: RSS_URL });
  const response = await fetch(RSS_URL);
  if (!response.ok) {
    throw new Error(`Unable to fetch RSS feed: ${response.status}`);
  }

  const $ = load(await response.text(), { xmlMode: true });
  // RSS 元数据会直接写入内容记录；schema 同时过滤缺失、非法 URL 与无效日期的条目。
  const rssArticles = $("item")
    .map((_, item) => ({
      title: $(item).find("title").first().text().trim(),
      description: $(item).find("description").first().text().trim(),
      publishDate: $(item).find("pubDate").first().text().trim(),
      url: $(item).find("link").first().text().trim(),
    }))
    .get()
    .flatMap((article) => {
      const parsed = articleSchema.safeParse(article);
      return parsed.success ? [parsed.data] : [];
    });

  console.log("[WebDevSimplified] RSS 解析完成", {
    validArticleCount: rssArticles.length,
  });

  // ── 步骤 1.2：批量查询已收录的 URL ─────────────────────────────────
  const existingUrls = await db.query.content
    .findMany({
      where: { type: "article" },
      columns: { url: true },
    })
    .then((data) => data.map((r) => r.url));

  // ── 步骤 1.3：仅返回尚未收录的条目 ─────────────────────────────────
  const missingArticles = rssArticles.filter(
    (article) => !existingUrls.includes(article.url),
  );
  console.log("[WebDevSimplified] 完成已收录文章去重", {
    existingArticleCount: existingUrls.length,
    missingArticleCount: missingArticles.length,
  });

  return missingArticles;
}

export async function ingestArticle(article: Article) {
  "use step";

  // ── 步骤 2.1：再次检查是否已入库 ────────────────────────────────────
  // 列表步骤完成后工作流仍可能重试，因此这里需要再次去重。
  console.log("[WebDevSimplified] 开始处理文章", {
    title: article.title,
    url: article.url,
  });
  const [existing] = await db
    .select({ id: content.id })
    .from(content)
    .where(eq(content.url, article.url))
    .limit(1);
  if (existing) {
    return { ingested: false };
  }

  // ── 步骤 2.2：抓取并提取文章主体 ───────────────────────────────────
  const response = await fetch(article.url);
  if (!response.ok) {
    throw new Error(
      `Unable to fetch article ${article.url}: ${response.status}`,
    );
  }

  const $ = load(await response.text());
  // 页面包含导航和页脚等无关内容；只持久化文章主体，供后续检索使用。
  const main = $("article main").first();
  if (main.length === 0) {
    throw new Error(`Article main element was not found for ${article.url}`);
  }

  const rawHtml = main.html();
  if (!rawHtml) {
    throw new Error(`Article main element was empty for ${article.url}`);
  }

  const thumbnailUrl = $("meta[property='og:image']").attr("content");
  if (!thumbnailUrl) {
    throw new Error(`OG image was not found for ${article.url}`);
  }

  // ── 步骤 2.3：按章节切分正文 ──────────────────────
  const articleChunks = chunkArticleText(main);

  // ── 步骤 2.4：原子写入文章与文本分块 ──────────────────────────────
  return db.transaction(async (tx) => {
    // URL 唯一约束是最终幂等保护，防止两个工作流同时处理同一篇文章。
    const [insertedContent] = await tx
      .insert(content)
      .values({
        title: article.title,
        description: article.description,
        publishDate: article.publishDate,
        url: article.url,
        thumbnailUrl,
        type: "article",
        content: rawHtml,
      })
      .onConflictDoNothing({ target: content.url })
      .returning({ id: content.id });

    if (!insertedContent) {
      return { ingested: false };
    }

    if (articleChunks.length > 0) {
      await tx.insert(chunks).values(
        articleChunks.map((text) => ({
          contentId: insertedContent.id,
          text,
        })),
      );
    }

    return { ingested: true };
  });
}

function chunkArticleText(main: ReturnType<ReturnType<typeof load>>) {
  const chunks: string[] = [];
  let tokens: string[] = [];

  const flush = () => {
    // 统一 HTML 格式空白，保证分块文本稳定且便于检索。
    const text = tokens.join(" ").replace(/\s+/g, " ").trim();
    if (text) chunks.push(text);
    tokens = [];
  };

  const visit = (node: {
    type?: string;
    name?: string;
    data?: string;
    children?: unknown[];
  }) => {
    if (["script", "style", "noscript", "template"].includes(node.name ?? "")) {
      // 排除脚本、样式和降级内容，避免将非正文写入分块。
      return;
    }

    if (node.type === "text" && node.data) {
      tokens.push(node.data);
      return;
    }

    if (node.type === "tag" && node.name === "h2") {
      // 二级标题是自然的检索边界：先结束上一节，再收集下一节正文。
      flush();
    }

    for (const child of node.children ?? []) {
      visit(child as typeof node);
    }
  };

  for (const node of main.contents().toArray()) {
    visit(node);
  }
  flush();

  return chunks;
}
