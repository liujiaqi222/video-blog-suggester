import { serverEnv } from '@/data/serverEnv';
import 'dotenv/config';
import {defineConfig} from "drizzle-kit";

export default defineConfig({
  out:'./src/db/migrations',
  schema:'./src/db/schema.ts',
  dialect:'postgresql',
  dbCredentials:{
    url: serverEnv.DATABASE_URL
  }
});