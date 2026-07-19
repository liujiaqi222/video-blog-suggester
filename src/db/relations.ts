import { defineRelations, defineRelationsPart } from "drizzle-orm";

import * as schema from "./schema";
import { chunks, content } from "./schema";

export const relations = defineRelations(schema);

export const contentRelations = defineRelationsPart({ content, chunks }, (r) => ({
  content: {
    // 一篇内容可拆分为多个文本块（一对多）。
    chunks: r.many.chunks(),
  },
  chunks: {
    // 每个文本块只归属于一篇内容；chunks.contentId 指向 content.id。
    content: r.one.content({
      from: r.chunks.contentId,
      to: r.content.id,
    }),
  },
}));
