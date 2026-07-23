"use server";

import { headers } from "next/headers";
import { asc, cosineDistance, desc, eq, lte, sql } from "drizzle-orm";

import { auth } from "@/lib/auth/auth";
import { embedChunks } from "@/lib/embedding/embed-chunks";
import { db } from "@/db/db";
import { chunks, content } from "@/db/schema";

// 单条搜索结果：聚合 content 元信息 + 匹配度最高的 chunk 数据。
export type SearchResult = {
  title: string;
  description: string;
  thumbnailUrl: string;
  url: string;
  publishDate: Date;
  type: "video" | "article";
  similarity: number;
  startPosition: number | null;
  rawText: string;
};

export async function searchContent(query: string): Promise<SearchResult[]> {
  // ── 步骤 1：鉴权，搜索仅对已登录用户开放 ──
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  // ── 步骤 2：将搜索关键词转换为向量 ──
  const trimmed = query.trim();
  if (!trimmed) return [];

  const embeddings = await embedChunks([trimmed]);
  const embedding = embeddings[0];
  if (!embedding) return [];

  // ── 步骤 3：向量搜索 + 关联内容 ──
  // cosineDistance(col, val) 映射为 pgvector 的 SQL 算子 col <=> val（余弦距离，等于 1 - 余弦相似度）。
  // distance 即该算子表达式（裸 <=>，可被 HNSW 索引匹配）；similarity = 1 - distance 还原为余弦相似度。
  const distance = cosineDistance(chunks.embedding, embedding);
  const similarity = sql<number>`1 - (${distance})`.as("similarity");

  // 3.1 DISTINCT ON 按 contentId 去重：Postgres 要求 ORDER BY 前缀包含 DISTINCT ON 列，
  // 故按 (contentId, distance) 排序，在每个 contentId 分组内保留 distance 最小（相似度最高）的 chunk。
  // 设计取舍：去重必须在 LIMIT 之前完成，否则同一 content 的大量高分块会挤占名额。
  const distinct = db
    .selectDistinctOn([chunks.contentId], {
      title: content.title,
      description: content.description,
      thumbnailUrl: content.thumbnailUrl,
      url: content.url,
      publishDate: content.publishDate,
      type: content.type,
      similarity,
      startPosition: chunks.startPosition,
      rawText: chunks.text,
    })
    .from(chunks)
    .innerJoin(content, eq(chunks.contentId, content.id))
    // 用 distance（裸 <=> 算子）而非 similarity：裸算子形态是 HNSW 索引匹配的前提（包成 1 - (<=>) 会失配）。
    // 注意：当前 DISTINCT ON 按 contentId 排序，HNSW 主要服务于 KNN 形态，此处实际多为 seq scan + sort；
    // 保持裸形式既是规范、少算一次 1 - x，也保证查询形态变化时仍索引友好。
    .where(lte(distance, 0.5))
    .orderBy(asc(chunks.contentId), asc(distance))
    .as("distinct");

  // 3.2 子查询受 DISTINCT ON 约束只能按 contentId 排序，相似度降序与 LIMIT 放到外层完成。
  const rows = await db
    .select()
    .from(distinct)
    .orderBy(desc(distinct.similarity))
    .limit(20);

  // ── 步骤 4：映射为返回结构 ──
  return rows.map((row) => ({
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    url: row.url,
    publishDate: row.publishDate,
    type: row.type,
    similarity: row.similarity,
    startPosition: row.startPosition,
    rawText: row.rawText,
  }));
}
