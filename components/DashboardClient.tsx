"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { WorkflowBar } from "./WorkflowBar";
import { ScoreBadge } from "./ScoreBadge";
import type { Analysis } from "@/lib/types";
import { formatDate, formatDateTime, titleCase } from "@/lib/utils";

type Summary = {
  id: string;
  nofoName: string;
  nofoFileName: string;
  projectCount: number;
  createdAt: string;
  status: string;
  topMatchScore: number;
  strongMatchCount: number;
};

export function DashboardClient() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recent, setRecent] = useState<Summary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nofoName, setNofoName] = useState("Safe Streets and Roads for All (SS4A) FY2024.pdf");
  const [projectName, setProjectName] = useState("Unfunded Projects - Jul 2024.xlsx");
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  async function refreshRecent() {
    const res = await fetch("/api/analyses");
    const data = (await res.json()) as { analyses: Summary[] };
    setRecent(data.analyses);
    if (!analysis && data.analyses[0]) {
      const full = await fetch(`/api/analyses/${data.analyses[0].id}`);
      const body = (await full.json()) as { analysis: Analysis };
      setAnalysis(body.analysis);
    }
  }

  useEffect(() => {
    void refreshRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function analyze(demo = true) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demo,
          nofoFileName: nofoName,
          projectFileName: projectName,
        }),
      });
      const data = (await res.json()) as { analysis?: Analysis; error?: string };
      if (!res.ok || !data.analysis) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
      await refreshRecent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  const top = useMemo(() => analysis?.matches.slice(0, 5) ?? [], [analysis]);
  const step = analysis ? 3 : 1;

  return (
    <div>
      <WorkflowBar step={step} />
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-base font-semibold">Upload Documents</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <UploadCard
                icon={<FileText className="h-8 w-8 text-red-600" />}
                label="NOFO Document (PDF)"
                fileName={nofoName}
                size="2.4 MB"
                onChange={() => setNofoName("Safe Streets and Roads for All (SS4A) FY2024.pdf")}
              />
              <UploadCard
                icon={<FileSpreadsheet className="h-8 w-8 text-emerald-700" />}
                label="Project List (Excel/CSV)"
                fileName={projectName}
                size="1.1 MB"
                onChange={() => setProjectName("Unfunded Projects - Jul 2024.xlsx")}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void analyze(true)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-deldot-blue px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-navy-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyze Projects
              </button>
              <button
                onClick={() => {
                  setAnalysis(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
              <Link href="/upload" className="text-sm font-medium text-deldot-blue hover:underline">
                Use a different NOFO or Unifier export
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Top Matched Projects</h2>
              {analysis && (
                <Link href={`/analysis/${analysis.id}`} className="text-sm font-medium text-deldot-blue hover:underline">
                  Open full review
                </Link>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Rank</th>
                    <th className="py-2 pr-3">Project Name</th>
                    <th className="py-2 pr-3">Match Score</th>
                    <th className="py-2 pr-3">Why It Qualifies (Summary)</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {top.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Upload a NOFO and click Analyze Projects to rank Unifier unfunded projects.
                      </td>
                    </tr>
                  )}
                  {top.map((m) => (
                    <tr key={m.projectId} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3 font-semibold">{m.rank}</td>
                      <td className="py-3 pr-3 font-medium">{m.projectName}</td>
                      <td className="py-3 pr-3">
                        <ScoreBadge score={m.score} />
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{m.whyItQualifies}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Link
                            href={analysis ? `/analysis/${analysis.id}?project=${m.projectId}` : "/projects"}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            className={`rounded-md border p-1.5 hover:bg-slate-50 ${saved[m.projectId] ? "border-deldot-gold text-deldot-gold" : "border-slate-200 text-slate-600"}`}
                            title="Save"
                            onClick={() => setSaved((s) => ({ ...s, [m.projectId]: !s[m.projectId] }))}
                          >
                            <Bookmark className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold">Recent Analyses</h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">NOFO Name</th>
                  <th className="py-2">Projects</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Top Match</th>
                  <th className="py-2">Download</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-slate-500">
                      No analyses yet. Run the SS4A sample to populate history.
                    </td>
                  </tr>
                )}
                {recent.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-2.5">
                      <Link href={`/analysis/${row.id}`} className="font-medium text-navy-900 hover:underline">
                        {row.nofoName}
                      </Link>
                    </td>
                    <td>{row.projectCount}</td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{titleCase(row.status)}</td>
                    <td>
                      <ScoreBadge score={row.topMatchScore} />
                    </td>
                    <td>
                      <a href={`/api/analyses/${row.id}/report`} className="inline-flex text-slate-600 hover:text-navy-900">
                        <Download className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold">Analysis Summary</h3>
            <dl className="space-y-2 text-sm">
              <Row label="NOFO" value={analysis?.nofoFileName ?? nofoName} />
              <Row label="Projects" value={`${analysis?.projectCount ?? 248} projects`} />
              <Row label="Status" value={analysis ? titleCase(analysis.status) : "Not started"} />
              <Row label="Uploaded" value={analysis ? formatDateTime(analysis.createdAt) : "Sample files ready"} />
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold">NOFO Key Criteria (Extracted)</h3>
            <ul className="space-y-2 text-sm text-navy-800">
              {(analysis?.criteria.programPriorities ?? [
                "Prevent roadway deaths",
                "Support data-driven safety planning",
                "Equity and community impact",
              ]).slice(0, 6).map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-deldot-blue" />
                  {c}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-card">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">AI Insight</div>
            <p className="text-sm leading-relaxed text-navy-900">
              {analysis?.insight ??
                "Based on the NOFO criteria and project data, 86 projects (35%) show strong potential."}
            </p>
          </section>
        </aside>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Link href="/guidance" className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card hover:border-deldot-blue">
          <HelpCircle className="mt-0.5 h-5 w-5 text-deldot-blue" />
          <div>
            <div className="font-semibold">Need Help?</div>
            <div className="text-sm text-slate-600">View Guidance for the Phase 1 pilot workflow.</div>
          </div>
        </Link>
        <Link href="/feedback" className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card hover:border-deldot-blue">
          <MessageSquare className="mt-0.5 h-5 w-5 text-deldot-blue" />
          <div>
            <div className="font-semibold">Feedback</div>
            <div className="text-sm text-slate-600">Provide Feedback so future recommendations improve.</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function UploadCard({
  icon,
  label,
  fileName,
  size,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  fileName: string;
  size: string;
  onChange: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-3 flex items-center gap-3">
        {icon}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{fileName}</div>
          <div className="text-xs text-slate-500">{size} · Ready</div>
        </div>
      </div>
      <button onClick={onChange} className="mt-3 text-sm font-medium text-deldot-blue hover:underline">
        Change File
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[200px] text-right font-medium">{value}</dd>
    </div>
  );
}
