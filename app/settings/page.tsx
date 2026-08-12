"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function reset() {
    await fetch("/api/projects", { method: "DELETE" });
    setMessage("Pilot data reset. Sample Unifier projects restored.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-semibold">Pilot settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Phase 1 is a controlled pilot. Matching uses extracted NOFO criteria, Unifier project attributes, and historic
          award intelligence. Optional LLM scoring can be added later without changing the Grant Manager workflow.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Unifier connection</dt>
            <dd className="font-medium">Excel/CSV export (Phase 1)</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Human review</dt>
            <dd className="font-medium">Required — Grant Manager finalizes</dd>
          </div>
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Learning loop</dt>
            <dd className="font-medium">Feedback stored and applied to later runs</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-500">Retention</dt>
            <dd className="font-medium">Local pilot store (not production Unifier)</dd>
          </div>
        </dl>
        <button onClick={() => void reset()} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">
          Reset pilot data
        </button>
        {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
      </section>
    </div>
  );
}
