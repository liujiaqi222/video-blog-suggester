import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";
 
export const serverEnv = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    EMBEDDING_PROVIDER: z.string(),
    EMBEDDING_BASE_URL:z.url(),
    EMBEDDING_API_KEY: z.string().optional(),
    CRON_SECRET: z.string()
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
