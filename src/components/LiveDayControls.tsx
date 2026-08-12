"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAutoAdvanceAction, simDayAction } from "@/app/actions/league";

/** Polls the server so live scores tick without a manual refresh. */
export function LiveAutoRefresh({
  active,
  intervalMs = 15000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs, router]);
  return null;
}

/** Plays day-by-day to the end of the season/postseason, one short request per day. */
export function RunOutButton({ leagueId }: { leagueId: string }) {
  const [running, setRunning] = useState(false);
  const [days, setDays] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);
  const router = useRouter();

  const run = async () => {
    setRunning(true);
    setError(null);
    setDays(0);
    stop.current = false;
    for (let i = 0; i < 400; i++) {
      if (stop.current) break;
      const res = await simDayAction(leagueId);
      if (res.error) {
        setError(res.error);
        break;
      }
      setDays((d) => d + 1);
      if (res.done || res.simulated === 0) break;
    }
    setRunning(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        className="btn btn-ghost !py-2 !px-4 !text-sm"
        disabled={running}
        onClick={running ? () => (stop.current = true) : run}
      >
        {running ? `Simulating… day ${days} (stop)` : "Play to the end"}
      </button>
      {error ? <p className="text-sm text-[#f0a8a8]">{error}</p> : null}
    </div>
  );
}

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
