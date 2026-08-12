import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { parseProjectWorkbook } from "@/lib/parse-projects";
import { getProjects, replaceProjects, resetStore } from "@/lib/store";
import { getUnfundedProjects, projectsToCsv } from "@/lib/sample-projects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("sample") === "csv") {
    const csv = projectsToCsv(getUnfundedProjects());
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="Unfunded Projects - Jul 2024.csv"',
      },
    });
  }
  const projects = await getProjects();
  return NextResponse.json({ projects, count: projects.length });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("projects");
  if (!(file instanceof File) || file.size === 0) return jsonError("Upload an Excel or CSV project list");
  const parsed = parseProjectWorkbook(Buffer.from(await file.arrayBuffer()));
  if (!parsed.length) return jsonError("No projects found");
  await replaceProjects(parsed);
  return NextResponse.json({ count: parsed.length, projects: parsed.slice(0, 25) });
}

export async function DELETE() {
  const store = await resetStore();
  return NextResponse.json({ ok: true, count: store.projects.length });
}
