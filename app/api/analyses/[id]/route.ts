import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getAnalysis } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const analysis = await getAnalysis(id);
  if (!analysis) return jsonError("Analysis not found", 404);
  return NextResponse.json({ analysis });
}
