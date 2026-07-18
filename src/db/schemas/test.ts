import {integer,snakeCase,varchar} from "drizzle-orm/pg-core";

export const testTable = snakeCase.table('users',{
    id: integer('id').primaryKey(),
    name: varchar('name', { length: 256 })
})