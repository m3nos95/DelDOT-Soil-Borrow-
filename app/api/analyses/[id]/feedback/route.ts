import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { addFeedback } from "@/lib/store";
import type { FeedbackType } from "@/lib/types";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    type?: FeedbackType;
    reason?: string;
    projectId?: string;
    projectName?: string;
  };
  if (!body.type || !body.reason?.trim()) return jsonError("Feedback type and reason are required");
  try {
    const feedback = await addFeedback(id, {
      type: body.type,
      reason: body.reason.trim(),
      projectId: body.projectId,
      projectName: body.projectName,
    });
    return NextResponse.json({ feedback });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to save feedback", 404);
  }
}
