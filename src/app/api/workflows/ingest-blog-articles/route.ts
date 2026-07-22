
import { ingestWebDevSimplifiedArticles } from "@/workflows/ingest-webdevsimplified";
import { verifyAndRunCron } from "@/workflows/utils/verifyAndRunCron";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return verifyAndRunCron(request, ingestWebDevSimplifiedArticles)
}


