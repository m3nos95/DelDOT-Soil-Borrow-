import { jsonError } from "@/lib/http";
import { analysisReportHtml, analysisToCsv } from "@/lib/report";
import { getAnalysis, getProjects } from "@/lib/store";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const analysis = await getAnalysis(id);
  if (!analysis) return jsonError("Analysis not found", 404);
  const projects = await getProjects();
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "html";

  if (format === "csv") {
    const csv = analysisToCsv(analysis, projects);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${analysis.criteria.programCode}-matches.csv"`,
      },
    });
  }

  const html = analysisReportHtml(analysis, projects);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
