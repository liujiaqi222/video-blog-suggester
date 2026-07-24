import { load } from "cheerio";
import { eq } from "drizzle-orm";

import { db } from "@/db/db";
import { chunks, content } from "@/db/schema";
import { batchExec } from "./utils/batchExec";
import { z } from "zod";
import { chunkArticleText } from "../lib/chunking/chunkArticle";
import { embedChunks } from "@/lib/embedding/embed-chunks";

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

type IngestArticleResult = {
  // 幂等工作流重试时，已存在的记录也表示目标状态已达成。
  ingested: true;
  // 区分本次是否实际插入，供上层汇总新增文章数量。
  created: boolean;
};

export async function ingestBlogArticles() {
  "use workflow";

  // ── 步骤 1：从 RSS 中找出数据库尚未收录的文章 ─────────────────────────
  console.log("[BlogArticles] 开始同步 RSS 文章");
  const articles = await getArticlesMissingFromDatabase();
  console.log("[BlogArticles] 本轮同步计划已确定", {
    pendingArticleCount: articles.length,
    batchSize: BATCH_SIZE,
  });

  if (articles.length === 0) {
    console.log("[BlogArticles] 所有 RSS 文章均已收录，本轮无需同步");
    return { discovered: 0, ingested: 0 };
  }

  // ── 步骤 2：按批并发抓取和入库 ──────────────────────────────────────
  // 每批完成后再处理下一批，防止并发请求数量随文章总数无限增长。
  const { failed, results } = await batchExec(articles, ingestArticle, {
    batchSize: BATCH_SIZE,
  });
  const ingested = results.filter((result) => result.created).length;

  if (failed > 0) {
    console.error("[BlogArticles] 部分文章处理失败", { failed });
  }

  console.log("[BlogArticles] RSS 同步完成", {
    pendingArticleCount: articles.length,
    processedArticleCount: results.length + failed,
    ingestedArticleCount: ingested,
    skippedArticleCount: results.length - ingested,
    failedArticleCount: failed,
  });

  return { discovered: articles.length, ingested };
}

async function getArticlesMissingFromDatabase(): Promise<Article[]> {
  "use step";

  // ── 步骤 1.1：获取并解析 RSS 条目 ──────────────────────────────────
  console.log("[BlogArticles] 正在获取 RSS feed", { url: RSS_URL });
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

  console.log("[BlogArticles] RSS 解析完成", { rssArticleCount: rssArticles.length });

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
  console.log("[BlogArticles] 已完成 RSS 与数据库去重", {
    rssArticleCount: rssArticles.length,
    existingArticleCount: existingUrls.length,
    pendingArticleCount: missingArticles.length,
  });

  return missingArticles;
}

export async function ingestArticle(
  article: Article,
): Promise<IngestArticleResult> {
  "use step";

  // ── 步骤 2.1：再次检查是否已入库 ────────────────────────────────────
  // 列表步骤完成后工作流仍可能重试，因此这里需要再次去重。
  console.log("[BlogArticles] 开始处理文章", {
    title: article.title,
    url: article.url,
  });
  const [existing] = await db
    .select({ id: content.id })
    .from(content)
    .where(eq(content.url, article.url))
    .limit(1);
  if (existing) {
    return { ingested: true, created: false };
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
  const chunkTexts = chunkArticleText(main);
  const embeddings = await embedChunks(chunkTexts)

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
      return { ingested: true, created: false };
    }

    if (chunkTexts.length > 0) {
      await tx.insert(chunks).values(
        chunkTexts.map((chunkText,i) => ({
          contentId: insertedContent.id,
          text:chunkText,
          embedding:embeddings[i]
        })),
      );
    }

    return { ingested: true, created: true };
  });
}
