import { serverEnv } from '@/data/serverEnv';
import { drizzle } from 'drizzle-orm/neon-http';
import { defineRelations } from "drizzle-orm";
import * as schemas from './schema';


export const db = drizzle(serverEnv.DATABASE_URL, {
    relations: defineRelations(schemas)
});
