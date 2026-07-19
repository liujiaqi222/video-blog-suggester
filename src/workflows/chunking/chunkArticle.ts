import { load } from "cheerio";

/**
 * @description 把文章主体 HTML 按 <h2> 章节切成纯文本数组，供后续入库和检索。
 */
export function chunkArticleText(main: ReturnType<ReturnType<typeof load>>) {
    const chunks: string[][] = [[]];

    // 在副本中清除非正文标签，既简化后续遍历，也不影响待保存的原始 HTML。
    const article = main.clone();
    article.find("script, style, noscript, template").remove();

    // 只处理 <main> 的直接子节点；每个 <h2> 开始一个新章节。
    const contents = article.contents();
    contents.each((index) => {
        const content = contents.eq(index);

        // 节点内部的格式空白没有语义；节点之间保留空行，便于后续阅读和检索。
        const text = content.text().replace(/\s+/g, " ").trim();

        if (content.is("h2")) {
            // 二级标题是自然的检索边界：标题归入它所开启的新章节。
            chunks.push(text ? [text] : []);
        } else if (text) {
            chunks[chunks.length - 1].push(text);
        }
    });

    return chunks.filter((chunk) => chunk.length > 0).map((chunk) => chunk.join("\n\n"));
}
