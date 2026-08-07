"use client";

import { useState, useTransition } from "react";
import {
  fillCpuTeamsAction,
  setDraftReadyAction,
  simDayAction,
  simWeekAction,
  startSeasonAction,
} from "@/app/actions/league";

export function CommissionerStart({
  leagueId,
  canStart,
  canFillCpu,
}: {
  leagueId: string;
  canStart: boolean;
  canFillCpu?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {canFillCpu ? (
        <button
          className="btn btn-ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              setMessage(null);
              const res = await fillCpuTeamsAction(leagueId);
              if (res?.error) setError(res.error);
              else setMessage(res.message ?? "CPU teams filled");
            })
          }
        >
          {pending ? "Filling…" : "Fill open slots with CPU"}
        </button>
      ) : null}
      <button
        className="btn btn-primary"
        disabled={!canStart || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await startSeasonAction(leagueId);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Starting…" : "Start season"}
      </button>
      {!canStart ? (
        <p className="text-sm text-[var(--fog)]">
          Lock human rosters first. Starting auto-fills any empty slots with CPU
          clubs (162-game schedule by default).
        </p>
      ) : (
        <p className="text-sm text-[var(--fog)]">
          Empty slots become CPU teams with auto-drafted rosters.
        </p>
      )}
      {message ? <p className="text-sm text-[var(--foul)]">{message}</p> : null}
      {error ? <p className="text-sm text-[#f0a8a8]">{error}</p> : null}
    </div>
  );
}

export function SimDayButton({ leagueId }: { leagueId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="btn btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await simDayAction(leagueId);
            if (res.error) setError(res.error);
          })
        }
      >
        {pending ? "Simulating…" : "Sim next day"}
      </button>
      <button
        className="btn btn-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await simWeekAction(leagueId);
            if (res.error) setError(res.error);
          })
        }
      >
        {pending ? "Simulating…" : "Sim week"}
      </button>
      {error ? <p className="basis-full text-sm text-[#f0a8a8]">{error}</p> : null}
    </div>
  );
}

export function ReadyToggle({
  leagueId,
  ready,
}: {
  leagueId: string;
  ready: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      className={`btn ${ready ? "btn-ghost" : "btn-primary"}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setDraftReadyAction(leagueId, !ready);
        })
      }
    >
      {ready ? "Unlock roster" : "Lock roster"}
    </button>
  );
}
