"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
  careerWAR?: number;
  takenBy?: string | null;
  onMyRoster?: boolean;
};

function draftHref(
  leagueId: string,
  opts: { tab?: string; q?: string; page?: number },
) {
  const params = new URLSearchParams();
  if (opts.tab && opts.tab !== "hitters") params.set("tab", opts.tab);
  if (opts.q) params.set("q", opts.q);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return `/league/${leagueId}/draft${qs ? `?${qs}` : ""}`;
}

export function DraftBoard({
  leagueId,
  salaryCap,
  payroll,
  players,
  draftReady,
  locked,
  tab,
  q,
  page,
  total,
}: {
  leagueId: string;
  salaryCap: number;
  payroll: number;
  players: PlayerRow[];
  draftReady: boolean;
  locked: boolean;
  tab: "hitters" | "pitchers" | "roster";
  q: string;
  page: number;
  total: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const remaining = salaryCap - payroll;

  function act(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
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
          <div className="mt-1 text-xs text-[var(--fog)]">
            Showing {players.length.toLocaleString()} of {total.toLocaleString()}{" "}
            · one career card per player
          </div>
        </div>
        {!locked ? (
          <button
            className={`btn ${draftReady ? "btn-ghost" : "btn-primary"}`}
            disabled={pending}
            onClick={() => act(() => setDraftReadyAction(leagueId, !draftReady))}
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

      <div className="flex flex-col gap-4 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="chip-tabs">
          {(
            [
              ["hitters", "Hitters"],
              ["pitchers", "Pitchers"],
              ["roster", "My roster"],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              href={draftHref(leagueId, {
                tab: id,
                page: 1,
                q: id === "roster" ? "" : query,
              })}
              className="chip-tab"
              data-active={tab === id}
            >
              {label}
            </Link>
          ))}
        </div>
        <form
          className="flex min-w-[220px] flex-1 gap-3 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(draftHref(leagueId, { tab, page: 1, q: query }));
          }}
        >
          <input
            className="field-input"
            placeholder="Search Ruth, Pedro…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-ghost !px-4" type="submit">
            Go
          </button>
        </form>
      </div>

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
            {players.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-[var(--fog)]">
                  No players match. Try another search.
                </td>
              </tr>
            ) : (
              players.map((p) => (
                <tr key={p.id} className="table-row">
                  <td>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-[var(--fog)]">
                      {p.description}
                    </div>
                  </td>
                  <td>{p.primaryPos}</td>
                  <td className="text-[var(--fog)]">
                    {p.yearFrom}–{p.yearTo}
                  </td>
                  <td className="font-mono text-sm">
                    {(p.careerWAR ?? 0).toFixed(1)}
                  </td>
                  <td>{formatSalary(p.salary)}</td>
                  <td className="text-right">
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
                      <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.12em] uppercase text-[var(--fog)]">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-[var(--fog)]">Page {page}</div>
    </div>
  );
}
