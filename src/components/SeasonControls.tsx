"use client";

import { useState, useTransition } from "react";
import {
  setDraftReadyAction,
  simDayAction,
  startSeasonAction,
} from "@/app/actions/league";

export function CommissionerStart({
  leagueId,
  canStart,
}: {
  leagueId: string;
  canStart: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <button
        className="btn btn-primary"
        disabled={!canStart || pending}
        onClick={() =>
          start(async () => {
            const res = await startSeasonAction(leagueId);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Starting…" : "Start season"}
      </button>
      {!canStart ? (
        <p className="text-sm text-[var(--fog)]">
          All teams must lock their rosters first.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

export function SimDayButton({ leagueId }: { leagueId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
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
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
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
