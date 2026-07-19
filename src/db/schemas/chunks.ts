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
  // Qwen3-Embedding-0.6B 的输出上限为 1024 维；存储约束必须与模型一致。
  embedding: vector({ dimensions: 1024 }),
  text: text("text").notNull(),
  ...timestamps
},
  table => [index("chunks_content_id_idx").on(table.contentId)]
)
