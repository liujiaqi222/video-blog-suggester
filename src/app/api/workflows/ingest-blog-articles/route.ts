
import { ingestBlogArticles } from "@/workflows/ingest-blog-articles";
import { verifyAndRunCron } from "@/workflows/utils/verifyAndRunCron";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return verifyAndRunCron(request, ingestBlogArticles)
}


