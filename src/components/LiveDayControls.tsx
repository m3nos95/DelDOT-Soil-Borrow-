"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAutoAdvanceAction, simDayAction } from "@/app/actions/league";

export function PlayDayButton({
  leagueId,
  label = "Play today's games",
}: {
  leagueId: string;
  label?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2">
      <button
        className="btn btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await simDayAction(leagueId);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Playing the day…" : label}
      </button>
      {error ? <p className="text-sm text-[#f0a8a8]">{error}</p> : null}
    </div>
  );
}

export function AutoAdvanceToggle({
  leagueId,
  enabled,
}: {
  leagueId: string;
  enabled: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className={`btn ${on ? "btn-primary" : "btn-ghost"} !py-2 !px-4 !text-sm`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const next = !on;
          setOn(next);
          const res = await setAutoAdvanceAction(leagueId, next);
          if (res.error) setOn(!next);
          else router.refresh();
        })
      }
    >
      {on ? "Daily auto-play: ON" : "Daily auto-play: OFF"}
    </button>
  );
}
