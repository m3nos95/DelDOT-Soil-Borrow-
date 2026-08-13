import { NextResponse } from "next/server";
import { listAnalyses } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const analyses = await listAnalyses();
  return NextResponse.json({
    analyses: analyses.map((a) => ({
      id: a.id,
      nofoName: a.nofoName,
      nofoFileName: a.nofoFileName,
      projectCount: a.projectCount,
      createdAt: a.createdAt,
      status: a.status,
      topMatchScore: a.matches[0]?.score ?? 0,
      strongMatchCount: a.strongMatchCount,
    })),
  });
}
