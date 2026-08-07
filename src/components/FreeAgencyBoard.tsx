"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cutPlayerAction, signFreeAgentAction } from "@/app/actions/league";
import { formatSalary } from "@/lib/format";

type PlayerRow = {
  id: string;
  name: string;
  primaryPos: string;
  yearFrom: number;
  yearTo: number;
  salary: number;
  careerWAR: number;
  description: string;
  isPitcher: boolean;
};

export function FreeAgencyBoard({
  leagueId,
  salaryCap,
  payroll,
  freeAgents,
  myRoster,
}: {
  leagueId: string;
  salaryCap: number;
  payroll: number;
  freeAgents: PlayerRow[];
  myRoster: PlayerRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"fa" | "roster">("fa");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const remaining = salaryCap - payroll;

  function act(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  const filtered = (tab === "fa" ? freeAgents : myRoster).filter((p) =>
    !q.trim()
      ? true
      : p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-[family-name:var(--font-display)] text-sm tracking-[0.18em] uppercase text-[var(--fog)]">
            Cap room
          </div>
          <div className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
            {formatSalary(remaining)}{" "}
            <span className="text-lg text-[var(--fog)]">
              / {formatSalary(salaryCap)}
            </span>
          </div>
        </div>
        <div className="chip-tabs">
          <button
            type="button"
            className="chip-tab"
            data-active={tab === "fa"}
            onClick={() => setTab("fa")}
          >
            Free agents
          </button>
          <button
            type="button"
            className="chip-tab"
            data-active={tab === "roster"}
            onClick={() => setTab("roster")}
          >
            Cut list
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-[#f0a8a8]">{error}</p> : null}

      <input
        className="field-input max-w-sm"
        placeholder="Search players…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="overflow-x-auto border-t border-[var(--line)]">
        <table className="draft-table min-w-[640px]">
          <thead>
            <tr>
              <th>Player</th>
              <th>Pos</th>
              <th>Career</th>
              <th>WAR</th>
              <th>Salary</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 80).map((p) => (
              <tr key={p.id} className="table-row">
                <td>
                  <div className="player-name">{p.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--fog)]">
                    {p.description}
                  </div>
                </td>
                <td className="stat-mono text-sm">{p.primaryPos}</td>
                <td className="stat-mono text-sm text-[var(--fog)]">
                  {p.yearFrom}–{p.yearTo}
                </td>
                <td className="stat-mono text-sm">{p.careerWAR.toFixed(1)}</td>
                <td className="stat-mono text-sm">{formatSalary(p.salary)}</td>
                <td className="text-right">
                  {tab === "fa" ? (
                    <button
                      className="btn btn-ghost !py-1.5 !px-3 !text-xs"
                      disabled={pending || p.salary > remaining}
                      onClick={() =>
                        act(() => signFreeAgentAction(leagueId, p.id))
                      }
                    >
                      Sign
                    </button>
                  ) : (
                    <button
                      className="btn btn-danger !py-1.5 !px-3 !text-xs"
                      disabled={pending}
                      onClick={() =>
                        act(() => cutPlayerAction(leagueId, p.id))
                      }
                    >
                      Cut
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-[var(--fog)]">
        Showing {Math.min(80, filtered.length)} of {filtered.length}. CPU clubs
        also sign and cut between sim days.
      </p>
    </div>
  );
}
