"use client";

import { useMemo, useState, useTransition } from "react";
import {
  draftPlayerAction,
  releasePlayerAction,
  setDraftReadyAction,
} from "@/app/actions/league";
import { formatSalary } from "@/lib/format";

type PlayerRow = {
  id: string;
  name: string;
  yearFrom: number;
  yearTo: number;
  primaryPos: string;
  salary: number;
  isPitcher: boolean;
  description: string;
  takenBy?: string | null;
  onMyRoster?: boolean;
};

export function DraftBoard({
  leagueId,
  salaryCap,
  payroll,
  players,
  draftReady,
  locked,
}: {
  leagueId: string;
  salaryCap: number;
  payroll: number;
  players: PlayerRow[];
  draftReady: boolean;
  locked: boolean;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"hitters" | "pitchers" | "roster">("hitters");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return players.filter((p) => {
      if (tab === "roster") return p.onMyRoster;
      if (tab === "hitters" && p.isPitcher) return false;
      if (tab === "pitchers" && !p.isPitcher) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.primaryPos.toLowerCase().includes(query)
      );
    });
  }, [players, q, tab]);

  const remaining = salaryCap - payroll;

  function act(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--fog)]">
            Cap room
          </div>
          <div className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
            {formatSalary(remaining)}{" "}
            <span className="text-lg text-[var(--fog)]">
              / {formatSalary(salaryCap)}
            </span>
          </div>
        </div>
        {!locked ? (
          <button
            className={`btn ${draftReady ? "btn-ghost" : "btn-primary"}`}
            disabled={pending}
            onClick={() =>
              act(() => setDraftReadyAction(leagueId, !draftReady))
            }
          >
            {draftReady ? "Unlock roster" : "Lock roster"}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {draftReady ? (
        <p className="text-sm text-[var(--foul)]">
          Roster locked — waiting on other owners / commissioner.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["hitters", "Hitters"],
            ["pitchers", "Pitchers"],
            ["roster", "My roster"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`btn !py-2 !px-3 !text-sm ${
              tab === id ? "btn-primary" : "btn-ghost"
            }`}
          >
            {label}
          </button>
        ))}
        <input
          className="field-input ml-auto max-w-xs"
          placeholder="Search players…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="scoreboard overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[var(--line)] text-xs uppercase tracking-[0.14em] text-[var(--fog)]">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Years</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="table-row border-b border-[var(--line)]">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-[var(--fog)]">{p.description}</div>
                </td>
                <td className="px-4 py-3">{p.primaryPos}</td>
                <td className="px-4 py-3 text-[var(--fog)]">
                  {p.yearFrom}–{p.yearTo}
                </td>
                <td className="px-4 py-3">{formatSalary(p.salary)}</td>
                <td className="px-4 py-3 text-right">
                  {p.onMyRoster && !draftReady && !locked ? (
                    <button
                      className="btn btn-danger !py-1.5 !px-3 !text-xs"
                      disabled={pending}
                      onClick={() =>
                        act(() => releasePlayerAction(leagueId, p.id))
                      }
                    >
                      Drop
                    </button>
                  ) : p.takenBy ? (
                    <span className="text-xs uppercase tracking-[0.12em] text-[var(--fog)]">
                      {p.takenBy}
                    </span>
                  ) : !draftReady && !locked ? (
                    <button
                      className="btn btn-ghost !py-1.5 !px-3 !text-xs"
                      disabled={pending || p.salary > remaining}
                      onClick={() =>
                        act(() => draftPlayerAction(leagueId, p.id))
                      }
                    >
                      Draft
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
