import type { Analysis, Project } from "./types";
import { formatCurrency, formatDateTime, titleCase } from "./utils";

export function analysisToCsv(analysis: Analysis, projects: Project[]): string {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const headers = [
    "Rank",
    "Match Score",
    "Eligibility",
    "Recommended",
    "Final Selection",
    "Unifier ID",
    "Project Name",
    "County",
    "Corridor",
    "Category",
    "Unfunded Amount",
    "Readiness",
    "Why It Qualifies",
    "Gaps",
  ];
  const rows = analysis.matches.map((m) => {
    const p = byId.get(m.projectId);
    return [
      m.rank,
      m.score,
      m.fitBand,
      m.recommended ? "Yes" : "No",
      analysis.finalSelections.includes(m.projectId) ? "Yes" : "No",
      p?.unifierId ?? "",
      csv(m.projectName),
      p?.county ?? "",
      p?.corridor ?? "",
      p?.category ?? "",
      p?.unfundedAmount ?? "",
      p?.readiness ?? "",
      csv(m.whyItQualifies),
      csv(m.gaps.join("; ")),
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

function csv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function analysisReportHtml(analysis: Analysis, projects: Project[]): string {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const top = analysis.matches.slice(0, 15);
  const selected = analysis.finalSelections.length
    ? analysis.matches.filter((m) => analysis.finalSelections.includes(m.projectId))
    : analysis.matches.filter((m) => m.recommended);

  const rows = top
    .map((m) => {
      const p = byId.get(m.projectId);
      return `<tr>
        <td>${m.rank}</td>
        <td>${m.score}%</td>
        <td>${m.projectName}</td>
        <td>${p?.county ?? ""}</td>
        <td>${formatCurrency(p?.unfundedAmount ?? 0)}</td>
        <td>${m.whyItQualifies}</td>
      </tr>`;
    })
    .join("");

  const feedback = analysis.feedback
    .map(
      (f) =>
        `<li><strong>${titleCase(f.type)}</strong>${f.projectName ? ` — ${f.projectName}` : ""}: ${f.reason}</li>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Grant Match Report — ${analysis.nofoName}</title>
  <style>
    body { font-family: "Public Sans", "Segoe UI", sans-serif; color: #0b2545; margin: 40px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .muted { color: #5b6b7c; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }
    th, td { border: 1px solid #d5dee8; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #0b2545; color: white; }
    .banner { background: #fff6c8; padding: 10px 12px; border-radius: 6px; margin: 16px 0; }
    .meta { display: flex; gap: 24px; margin: 12px 0 20px; font-size: 13px; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .brand img { width: 56px; height: 56px; }
  </style>
</head>
<body>
  <div class="brand">
    <img src="/deldot-logo.png" alt="Delaware Department of Transportation" />
    <p class="muted">Delaware Department of Transportation · AI Grant Matching Agent · Phase 1 Pilot</p>
  </div>
  <h1>${analysis.nofoName}</h1>
  <div class="meta">
    <div>File: ${analysis.nofoFileName}</div>
    <div>Projects: ${analysis.projectCount}</div>
    <div>Generated: ${formatDateTime(analysis.updatedAt)}</div>
    <div>Status: ${titleCase(analysis.status)}</div>
  </div>
  <p>${analysis.insight}</p>
  <div class="banner"><strong>The final decision remains with the Grant Manager.</strong> AI scores are decision support only.</div>
  <h2>Top matched projects</h2>
  <table>
    <thead><tr><th>Rank</th><th>Score</th><th>Project</th><th>County</th><th>Unfunded</th><th>Why it qualifies</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>Grant Manager selections</h2>
  <ul>${selected.map((m) => `<li>${m.projectName} (${m.score}%)</li>`).join("") || "<li>Not yet finalized</li>"}</ul>
  <h2>Human-in-the-loop feedback</h2>
  <ul>${feedback || "<li>No feedback recorded</li>"}</ul>
</body>
</html>`;
}
