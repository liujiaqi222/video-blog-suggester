import { start } from "workflow/api";

import { ingestWebDevSimplifiedArticles } from "@/workflows/ingest-webdevsimplified";

export async function POST() {
  const run = await start(ingestWebDevSimplifiedArticles);

  return Response.json(
    { runId: run.runId, status: "started" },
    { status: 202 },
  );
}
