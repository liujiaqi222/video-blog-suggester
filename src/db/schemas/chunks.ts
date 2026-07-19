import { sql } from "drizzle-orm";
import { index, integer, snakeCase, text, uuid, vector } from "drizzle-orm/pg-core";

import { content } from "./content";
import { timestamps } from "../utils";

export const chunks = snakeCase.table("chunks", {
  id: uuid()
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  contentId: uuid()
    .notNull()
    .references(() => content.id, { onDelete: "cascade" }),
  startPosition: integer(),
  // 数据库只接受 1536 维向量；更换 embedding 模型时必须同步调整存量数据和此约束。
  embedding: vector({ dimensions: 1536 }),
  text: text("text").notNull(),
  ...timestamps
},
  table => [index("chunks_content_id_idx").on(table.contentId)]
)
