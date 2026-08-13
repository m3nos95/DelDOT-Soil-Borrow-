"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatDate, titleCase } from "@/lib/utils";

type Row = {
  id: string;
  nofoName: string;
  projectCount: number;
  createdAt: string;
  status: string;
  topMatchScore: number;
};

export default function ReportsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    void fetch("/api/analyses")
      .then((r) => r.json())
      .then((d: { analyses: Row[] }) => setRows(d.analyses));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-lg font-semibold">Reports</h2>
      <p className="mb-4 text-sm text-slate-600">
        Download Grant Manager-ready match reports. HTML opens in the browser for print-to-PDF; CSV is for Unifier follow-up.
      </p>
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2">NOFO</th>
            <th className="py-2">Date</th>
            <th className="py-2">Status</th>
            <th className="py-2">Top score</th>
            <th className="py-2">Download</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="py-2.5 font-medium">{row.nofoName}</td>
              <td>{formatDate(row.createdAt)}</td>
              <td>{titleCase(row.status)}</td>
              <td>
                <ScoreBadge score={row.topMatchScore} />
              </td>
              <td className="space-x-3">
                <a className="inline-flex items-center gap-1 text-deldot-blue" href={`/api/analyses/${row.id}/report`}>
                  <Download className="h-4 w-4" /> HTML
                </a>
                <a className="text-deldot-blue" href={`/api/analyses/${row.id}/report?format=csv`}>
                  CSV
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">
          No reports yet. Run an analysis from the <Link href="/" className="text-deldot-blue underline">Dashboard</Link>.
        </p>
      )}
    </div>
  );
}
