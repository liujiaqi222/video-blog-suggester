import { sql } from "drizzle-orm";
import { date, snakeCase, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";

export const content = snakeCase.table("content", {
  id: uuid()
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  title: text().notNull(),
  description: text().notNull(),
  publishDate: date({ mode: "date" }).notNull(),
  url: text().notNull().unique(),
  thumbnailUrl: text().notNull(),
  type: text( { enum: ["video", "article"] }).notNull(),
  content: text().notNull(),
  ...timestamps
});
