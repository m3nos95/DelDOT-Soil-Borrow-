"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  draftPlayerAction,
  syncDraftClockAction,
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

type DraftClock = {
  complete: boolean;
  isMyTurn: boolean;
  onClockAbbr: string | null;
  onClockName: string | null;
  round: number;
  pickInRound: number;
  pickNumber: number;
  totalPicks: number;
  rounds: number;
  order: { abbr: string; name: string; isCpu: boolean; isYou: boolean }[];
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
  total,
  clock,
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
  clock: DraftClock;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const remaining = salaryCap - payroll;
  const usedPct = Math.min(100, Math.round((payroll / salaryCap) * 100));

  function act(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  // If a CPU is on the clock when you open the board, advance them.
  useEffect(() => {
    if (locked || clock.complete) return;
    if (clock.isMyTurn || !clock.onClockAbbr) return;
    let cancelled = false;
    (async () => {
      await syncDraftClockAction(leagueId);
      if (!cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [
    leagueId,
    locked,
    clock.complete,
    clock.isMyTurn,
    clock.onClockAbbr,
    clock.pickNumber,
    router,
  ]);

  const canDraft = !locked && !clock.complete && clock.isMyTurn && !draftReady;

  return (
    <div className="space-y-2">
      <div className="draft-sticky">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-[family-name:var(--font-display)] text-sm tracking-[0.18em] uppercase text-[var(--fog)]">
              Cap room
            </div>
            <div className="font-[family-name:var(--font-display)] text-4xl tracking-wide sm:text-5xl">
              {formatSalary(remaining)}{" "}
              <span className="text-lg text-[var(--fog)]">
                / {formatSalary(salaryCap)}
              </span>
            </div>
            <div
              className="cap-meter"
              data-tight={remaining < salaryCap * 0.15 ? "true" : "false"}
              aria-hidden
            >
              <span style={{ width: `${usedPct}%` }} />
            </div>
            <div className="mt-2 text-xs text-[var(--fog)]">
              Showing {players.length.toLocaleString()} of{" "}
              {total.toLocaleString()} · one career card per player · full career
              rates
            </div>
          </div>
          <div className="text-sm sm:text-right">
            {clock.complete ? (
              <p className="text-[var(--foul)]">
                Snake draft complete — commissioner can start the season.
              </p>
            ) : (
              <>
                <p className="font-[family-name:var(--font-display)] text-sm tracking-[0.14em] uppercase text-[var(--foul)]">
                  {clock.isMyTurn
                    ? "You're on the clock"
                    : `On the clock: ${clock.onClockAbbr ?? "—"}`}
                </p>
                <p className="mt-1 text-[var(--fog)]">
                  Round {clock.round}/{clock.rounds} · pick {clock.pickInRound} ·{" "}
                  overall {Math.min(clock.pickNumber + 1, clock.totalPicks)}/
                  {clock.totalPicks}
                </p>
              </>
            )}
          </div>
        </div>

        {clock.order.length ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--fog)]">
            <span className="font-[family-name:var(--font-display)] tracking-[0.12em] uppercase">
              Order
            </span>
            {clock.order.map((t, i) => (
              <span
                key={`${t.abbr}-${i}`}
                className={
                  t.isYou ? "text-[var(--foul)]" : undefined
                }
              >
                {i + 1}. {t.abbr}
                {t.isCpu ? " (CPU)" : ""}
                {i < clock.order.length - 1 ? " →" : ""}
              </span>
            ))}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-[#f0a8a8]">{error}</p> : null}
        {!clock.complete && !clock.isMyTurn && !locked ? (
          <p className="mt-3 text-sm text-[var(--fog)]">
            Waiting on {clock.onClockName ?? clock.onClockAbbr}
            {clock.onClockAbbr?.includes("CPU") || clock.order.find((o) => o.abbr === clock.onClockAbbr)?.isCpu
              ? " — CPU is picking…"
              : "."}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
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
            aria-label="Search players"
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
                <td colSpan={6} className="py-10 text-[var(--fog)]">
                  No players match. Try another search.
                </td>
              </tr>
            ) : (
              players.map((p) => (
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
                  <td className="stat-mono text-sm">
                    {(p.careerWAR ?? 0).toFixed(1)}
                  </td>
                  <td className="stat-mono text-sm">
                    {formatSalary(p.salary)}
                  </td>
                  <td className="text-right">
                    {p.onMyRoster ? (
                      <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.12em] uppercase text-[var(--foul)]">
                        Yours
                      </span>
                    ) : p.takenBy ? (
                      <span className="font-[family-name:var(--font-display)] text-xs tracking-[0.12em] uppercase text-[var(--fog)]">
                        {p.takenBy}
                      </span>
                    ) : canDraft ? (
                      <button
                        className="btn btn-ghost !py-1.5 !px-3 !text-xs"
                        disabled={pending || p.salary > remaining}
                        onClick={() =>
                          act(() => draftPlayerAction(leagueId, p.id))
                        }
                      >
                        Draft
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--fog)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
