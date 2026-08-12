"use client";

import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import { formatCurrency, titleCase } from "@/lib/utils";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    void fetch("/api/projects")
      .then((r) => r.json())
      .then((d: { projects: Project[] }) => setProjects(d.projects));
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(projects.map((p) => p.category))).sort()],
    [projects],
  );

  const filtered = projects.filter((p) => {
    const hay = `${p.name} ${p.unifierId} ${p.corridor} ${p.county} ${p.tags.join(" ")}`.toLowerCase();
    const okQ = !q || hay.includes(q.toLowerCase());
    const okC = category === "all" || p.category === category;
    return okQ && okC;
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Unfunded Unifier projects</h2>
          <p className="text-sm text-slate-600">
            {filtered.length} of {projects.length} projects · Phase 1 uses an export rather than a live Unifier feed
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, Unifier ID, corridor…"
            className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : titleCase(c)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Unifier ID</th>
              <th className="py-2">Project</th>
              <th className="py-2">County</th>
              <th className="py-2">Category</th>
              <th className="py-2">Unfunded</th>
              <th className="py-2">Readiness</th>
              <th className="py-2">Crash (F/SI)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 120).map((p) => (
              <tr key={p.id} className="border-b border-slate-100 align-top">
                <td className="py-2 font-mono text-xs">{p.unifierId}</td>
                <td className="py-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="max-w-md text-xs text-slate-500">{p.description}</div>
                </td>
                <td className="py-2">{p.county}</td>
                <td className="py-2">{titleCase(p.category)}</td>
                <td className="py-2">{formatCurrency(p.unfundedAmount)}</td>
                <td className="py-2">{titleCase(p.readiness)}</td>
                <td className="py-2">
                  {p.crashHistory.fatalities5yr}/{p.crashHistory.seriousInjuries5yr}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
