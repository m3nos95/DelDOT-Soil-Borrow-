"use client";

import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-600">
              Delaware Department of Transportation
            </div>
            <h1 className="text-lg font-semibold text-navy-900">AI Grant Matching Agent (Phase 1 Pilot)</h1>
          </div>
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            Human-in-the-loop · Grant Manager decides
          </div>
        </header>
        <main className="px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
