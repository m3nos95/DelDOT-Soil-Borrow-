"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime, titleCase } from "@/lib/utils";

type Row = {
  id: string;
  nofoName: string;
  projectCount: number;
  createdAt: string;
  status: string;
  strongMatchCount: number;
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    void fetch("/api/analyses")
      .then((r) => r.json())
      .then((d: { analyses: Row[] }) => setRows(d.analyses));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-lg font-semibold">History</h2>
      <p className="mb-4 text-sm text-slate-600">
        Each NOFO run is retained so Grant Managers can compare recommendations over time and see how feedback changed later matches.
      </p>
      <ol className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <Link href={`/analysis/${row.id}`} className="font-semibold hover:underline">
                {row.nofoName}
              </Link>
              <span className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {row.projectCount} projects evaluated · {row.strongMatchCount} strong matches · {titleCase(row.status)}
            </div>
          </li>
        ))}
      </ol>
      {rows.length === 0 && <p className="text-sm text-slate-600">History is empty until the first analysis is run.</p>}
    </div>
  );
}
