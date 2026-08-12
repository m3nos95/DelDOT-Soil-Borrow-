"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { WorkflowBar } from "@/components/WorkflowBar";

export default function UploadPage() {
  const router = useRouter();
  const [nofo, setNofo] = useState<File | null>(null);
  const [projects, setProjects] = useState<File | null>(null);
  const [sample, setSample] = useState("ss4a");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (nofo) form.set("nofo", nofo);
      else form.set("sampleNofo", sample);
      if (projects) form.set("projects", projects);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = (await res.json()) as { analysis?: { id: string }; error?: string };
      if (!res.ok || !data.analysis) throw new Error(data.error ?? "Upload failed");
      router.push(`/analysis/${data.analysis.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <WorkflowBar step={1} />
      <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold">Upload NOFO & Unifier project list</h2>
          <p className="mt-1 text-sm text-slate-600">
            Phase 1 uses a Unifier Excel/CSV export. Live Unifier connectivity is planned for a later phase.
          </p>
          {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

          <label className="mt-5 block text-sm font-semibold">NOFO document</label>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4">
            <FileText className="h-8 w-8 text-red-600" />
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => setNofo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <div className="mt-3">
            <label className="text-sm font-semibold">Or use a sample USDOT NOFO</label>
            <select
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ss4a">SS4A FY2024 — Safe Streets and Roads for All</option>
              <option value="raise">RAISE FY2024</option>
              <option value="bridge">Bridge Investment Program FY2024</option>
              <option value="protect">PROTECT Discretionary FY2024</option>
            </select>
            <a className="mt-1 inline-block text-xs text-deldot-blue hover:underline" href={`/api/samples/nofo?id=${sample}`}>
              Download sample text
            </a>
          </div>

          <label className="mt-5 block text-sm font-semibold">Unfunded projects (Excel or CSV)</label>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4">
            <FileSpreadsheet className="h-8 w-8 text-emerald-700" />
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setProjects(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </div>
          <a className="mt-1 inline-block text-xs text-deldot-blue hover:underline" href="/api/projects?sample=csv">
            Download sample Unifier export (248 projects)
          </a>

          <button
            type="submit"
            disabled={busy}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-deldot-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Extract criteria & match projects
          </button>
        </section>
      </form>
    </div>
  );
}
