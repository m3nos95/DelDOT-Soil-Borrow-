"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { WorkflowBar } from "@/components/WorkflowBar";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { Analysis, FeedbackType, Project } from "@/lib/types";
import { formatCurrency, titleCase } from "@/lib/utils";

export default function AnalysisDetailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-600">Loading analysis…</div>}>
      <AnalysisDetail />
    </Suspense>
  );
}

function AnalysisDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(search.get("project"));
  const [reason, setReason] = useState("");
  const [fbType, setFbType] = useState<FeedbackType>("comment");
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"recommended" | "all">("recommended");

  async function load() {
    const [aRes, pRes] = await Promise.all([
      fetch(`/api/analyses/${params.id}`),
      fetch("/api/projects"),
    ]);
    const aData = (await aRes.json()) as { analysis?: Analysis };
    const pData = (await pRes.json()) as { projects: Project[] };
    if (aData.analysis) {
      setAnalysis(aData.analysis);
      setSelected(new Set(aData.analysis.finalSelections));
    }
    setProjects(pData.projects);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const focus = analysis?.matches.find((m) => m.projectId === focusId) ?? analysis?.matches[0];
  const focusProject = focus ? byId.get(focus.projectId) : undefined;
  const rows = (analysis?.matches ?? []).filter((m) => (filter === "all" ? true : m.recommended));

  async function sendFeedback() {
    if (!analysis || !reason.trim()) return;
    await fetch(`/api/analyses/${analysis.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: fbType,
        reason,
        projectId: focus?.projectId,
        projectName: focus?.projectName,
      }),
    });
    setReason("");
    setMessage("Feedback saved. It will influence future matching runs.");
    await load();
  }

  async function finalize() {
    if (!analysis) return;
    const additions = [...selected].filter((id) => !analysis.matches.find((m) => m.projectId === id && m.recommended));
    const res = await fetch(`/api/analyses/${analysis.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedIds: [...selected], additions }),
    });
    const data = (await res.json()) as { analysis: Analysis };
    setAnalysis(data.analysis);
    setMessage("Selections finalized. The Grant Manager decision is the system of record.");
  }

  if (!analysis) {
    return <div className="text-sm text-slate-600">Loading analysis…</div>;
  }

  return (
    <div>
      <WorkflowBar step={3} />
      <div className="mb-4 rounded-lg bg-yellow-200 px-4 py-2 text-sm font-semibold text-navy-900">
        The final decision remains with the Grant Manager.
      </div>
      {message && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{analysis.nofoName}</h2>
              <p className="text-sm text-slate-600">{analysis.insight}</p>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "recommended" | "all")}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="recommended">Eligible recommendations</option>
              <option value="all">All projects</option>
            </select>
          </div>
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Select</th>
                  <th className="py-2">Rank</th>
                  <th className="py-2">Project</th>
                  <th className="py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      {filter === "recommended"
                        ? "No projects passed the eligibility gate for this NOFO."
                        : "No projects in this analysis."}
                    </td>
                  </tr>
                )}
                {rows.slice(0, 80).map((m) => (
                  <tr
                    key={m.projectId}
                    className={`cursor-pointer border-b border-slate-100 ${focusId === m.projectId ? "bg-sky-50" : ""}`}
                    onClick={() => setFocusId(m.projectId)}
                  >
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(m.projectId)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(m.projectId);
                          else next.delete(m.projectId);
                          setSelected(next);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="py-2">{m.rank}</td>
                    <td className="py-2 font-medium">{m.projectName}</td>
                    <td className="py-2">
                      <ScoreBadge score={m.score} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => void finalize()} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
              Finalize Grant Manager selections
            </button>
            <Link href={`/api/analyses/${analysis.id}/report`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
              Preview report
            </Link>
            <Link href={`/api/analyses/${analysis.id}/report?format=csv`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
              Download CSV
            </Link>
          </div>
        </section>

        <aside className="space-y-4">
          {focus && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <h3 className="font-semibold">{focus.projectName}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Eligibility: {focus.fitBand}
              </p>
              {focusProject && (
                <p className="mt-1 text-sm text-slate-600">
                  {focusProject.unifierId} · {focusProject.county} · {focusProject.corridor} ·{" "}
                  {formatCurrency(focusProject.unfundedAmount)} unfunded · {titleCase(focusProject.readiness)}
                </p>
              )}
              <p className="mt-3 text-sm">{focus.whyItQualifies}</p>
              <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[11px]">
                {Object.entries(focus.breakdown).map(([k, v]) => (
                  <div key={k} className="rounded bg-slate-50 p-1">
                    <div className="font-bold">{v}</div>
                    <div className="capitalize text-slate-500">{k === "fundingObjectives" ? "funding" : k}</div>
                  </div>
                ))}
              </div>
              <h4 className="mt-3 text-xs font-semibold uppercase text-slate-500">Strengths</h4>
              <ul className="mt-1 list-disc pl-4 text-sm">
                {focus.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              {focus.gaps.length > 0 && (
                <>
                  <h4 className="mt-3 text-xs font-semibold uppercase text-slate-500">Gaps</h4>
                  <ul className="mt-1 list-disc pl-4 text-sm">
                    {focus.gaps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="font-semibold">Grant Manager Feedback</h3>
            <p className="mt-1 text-sm text-slate-600">After reviewing recommendations, the Grant Manager can provide feedback:</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-navy-800">
              <li>Why a project should not have been selected</li>
              <li>Why another project should have been recommended</li>
              <li>Corrections and additional comments</li>
            </ul>
            <select
              value={fbType}
              onChange={(e) => setFbType(e.target.value as FeedbackType)}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="reject">Should not have been selected</option>
              <option value="add">Another project should have been recommended</option>
              <option value="correct">Correction</option>
              <option value="comment">Additional comment</option>
            </select>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Explain the decision so the next run can learn from it."
            />
            <button onClick={() => void sendFeedback()} className="mt-2 rounded-lg bg-deldot-blue px-3 py-2 text-sm font-semibold text-white">
              Save feedback
            </button>
            {analysis.feedback.length > 0 && (
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {analysis.feedback.map((f) => (
                  <li key={f.id} className="rounded bg-slate-50 p-2">
                    <strong>{titleCase(f.type)}</strong>
                    {f.projectName ? ` · ${f.projectName}` : ""}: {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
