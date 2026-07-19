import { serverEnv } from '@/data/serverEnv';
import { drizzle } from 'drizzle-orm/neon-http';
import { contentRelations, relations } from './relations';
import { authRelations } from './schema';


export const db = drizzle(serverEnv.DATABASE_URL, {
    relations:{
        ...relations,...contentRelations,...authRelations
    }
});
