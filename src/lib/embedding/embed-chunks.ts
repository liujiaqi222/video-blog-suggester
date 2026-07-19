import { embedMany } from "ai";

import { getEmbeddingModel } from "./get-embedding-model";

export async function embedChunks(texts: string[]) {
  // 空分块无需请求 embedding 服务，避免无效调用。
  if (texts.length === 0) return [];

  const result = await embedMany({
    model: getEmbeddingModel(),
    values: texts,
    maxParallelCalls: 100,
  });

  return result.embeddings;
}
