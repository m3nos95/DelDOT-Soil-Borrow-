"use client";

import { useState } from "react";

export default function FeedbackPage() {
  const [sent, setSent] = useState(false);
  const [text, setText] = useState("");

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="text-lg font-semibold">Pilot feedback</h2>
      <p className="mt-1 text-sm text-slate-600">
        Use this form for product feedback on the Phase 1 pilot. Project-level match feedback belongs on the analysis
        review screen so it can train later runs.
      </p>
      {sent ? (
        <p className="mt-4 text-sm text-emerald-700">Thank you. Comments are recorded for the AI committee pilot review.</p>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="What worked, what was missing, and where human review must stay."
          />
          <button className="rounded-lg bg-deldot-blue px-4 py-2 text-sm font-semibold text-white">Submit</button>
        </form>
      )}
    </div>
  );
}
