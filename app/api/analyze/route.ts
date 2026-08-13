import { NextResponse } from "next/server";
import { extractNofoCriteria, sampleNofoTextForFile } from "@/lib/extract-nofo";
import { extractTextFromUpload } from "@/lib/extract-text";
import { jsonError } from "@/lib/http";
import { parseProjectWorkbook } from "@/lib/parse-projects";
import { runAnalysis } from "@/lib/run-analysis";
import { getUnfundedProjects } from "@/lib/sample-projects";
import { replaceProjects } from "@/lib/store";
import { SAMPLE_SS4A_NOFO } from "@/lib/sample-nofo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      demo?: boolean;
      nofoText?: string;
      nofoFileName?: string;
      projectFileName?: string;
    };
    if (body.demo) {
      await replaceProjects(getUnfundedProjects());
      const analysis = await runAnalysis({
        nofoText: SAMPLE_SS4A_NOFO,
        nofoFileName: "Safe Streets and Roads for All (SS4A) FY2024.pdf",
        projectFileName: "Unfunded Projects - Jul 2024.xlsx",
        projects: getUnfundedProjects(),
      });
      return NextResponse.json({ analysis });
    }
    const nofoText = body.nofoText?.trim();
    if (!nofoText) return jsonError("NOFO text is required");
    const analysis = await runAnalysis({
      nofoText,
      nofoFileName: body.nofoFileName ?? "pasted-nofo.txt",
      projectFileName: body.projectFileName ?? "Unifier export",
    });
    return NextResponse.json({ analysis });
  }

  const form = await request.formData();
  const nofo = form.get("nofo");
  const projectsFile = form.get("projects");

  let nofoText = "";
  let nofoFileName = "uploaded-nofo.txt";
  if (nofo instanceof File && nofo.size > 0) {
    nofoFileName = nofo.name;
    const buffer = Buffer.from(await nofo.arrayBuffer());
    nofoText = await extractTextFromUpload(buffer, nofo.name, nofo.type);
  } else {
    const sampleName = String(form.get("sampleNofo") ?? "");
    nofoText = sampleNofoTextForFile(sampleName) ?? SAMPLE_SS4A_NOFO;
    nofoFileName = sampleName || "Safe Streets and Roads for All (SS4A) FY2024.pdf";
  }

  let projectFileName = "Unifier unfunded projects";
  if (projectsFile instanceof File && projectsFile.size > 0) {
    projectFileName = projectsFile.name;
    const buffer = Buffer.from(await projectsFile.arrayBuffer());
    const parsed = parseProjectWorkbook(buffer);
    if (!parsed.length) return jsonError("No projects found in the uploaded spreadsheet");
    await replaceProjects(parsed);
    const analysis = await runAnalysis({
      nofoText,
      nofoFileName,
      projectFileName,
      projects: parsed,
    });
    return NextResponse.json({ analysis, criteria: extractNofoCriteria(nofoText, nofoFileName) });
  }

  const analysis = await runAnalysis({
    nofoText,
    nofoFileName,
    projectFileName,
  });
  return NextResponse.json({ analysis });
}
