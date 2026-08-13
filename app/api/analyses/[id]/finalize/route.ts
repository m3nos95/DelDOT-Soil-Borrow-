import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { applyHumanDecisions } from "@/lib/matching";
import { getAnalysis, saveAnalysis } from "@/lib/store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const analysis = await getAnalysis(id);
  if (!analysis) return jsonError("Analysis not found", 404);
  const body = (await request.json()) as { selectedIds?: string[]; additions?: string[] };
  const next = applyHumanDecisions(analysis, body.selectedIds ?? [], body.additions ?? []);
  await saveAnalysis(next);
  return NextResponse.json({ analysis: next });
}
