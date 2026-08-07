"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayEvent } from "@/lib/sim";

type Props = {
  awayName: string;
  homeName: string;
  awayAbbr: string;
  homeAbbr: string;
  plays: PlayEvent[];
  finalAway: number;
  finalHome: number;
};

function speedMs(level: number) {
  return [1400, 1000, 700, 420, 220][Math.min(4, Math.max(0, level - 1))];
}

function isBigPlay(text: string) {
  return /homers|forcing in a run|run scores|runs score|steals|caught stealing|enters from the pen|double play/i.test(
    text,
  );
}

export function Gamecast({
  awayName,
  homeName,
  awayAbbr,
  homeAbbr,
  plays,
  finalAway,
  finalHome,
}: Props) {
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(3);
  const [done, setDone] = useState(false);
  const speedRef = useRef(speed);

  speedRef.current = speed;

  const play = idx >= 0 ? plays[idx] : null;

  useEffect(() => {
    if (!playing || done || plays.length === 0) return;
    const t = window.setTimeout(() => {
      setIdx((i) => {
        if (i >= plays.length - 1) {
          setDone(true);
          setPlaying(false);
          return i;
        }
        const next = i + 1;
        if (next >= plays.length - 1) {
          setDone(true);
          setPlaying(false);
        }
        return next;
      });
    }, speedMs(speedRef.current));
    return () => window.clearTimeout(t);
  }, [playing, idx, done, plays.length]);

  const bases = play?.bases ?? [false, false, false];
  const outs = play?.outs ?? 0;
  const feed = plays.slice(0, Math.max(0, idx + 1)).slice(-10);

  return (
    <section className="scoreboard mb-6 overflow-hidden p-4 sm:p-6 lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
          Gamecast
        </h2>
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--fog)]">
          {awayAbbr} @ {homeAbbr}
        </p>
      </div>

      <div className="mb-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--fog)]">
            {awayName}
          </div>
          <div className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-wide">
            {play?.awayScore ?? 0}
          </div>
        </div>
        <div className="text-center font-mono text-xs uppercase tracking-widest text-[var(--foul)]">
          <div>
            {play
              ? `${play.half === "top" ? "Top" : "Bot"} ${play.inning}`
              : "Top 1"}
          </div>
          <div className="mt-2 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full border border-[var(--foul)] ${
                  i < outs ? "bg-[var(--foul)]" : ""
                }`}
              />
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs uppercase tracking-wider text-[var(--fog)]">
            {homeName}
          </div>
          <div className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-wide">
            {play?.homeScore ?? 0}
          </div>
        </div>
      </div>

      <div className="mx-auto mb-4 aspect-square w-full max-w-[360px]">
        <svg
          viewBox="0 0 400 400"
          className="h-full w-full border border-[var(--line)]"
          style={{
            background:
              "radial-gradient(ellipse 55% 40% at 50% 58%, rgba(139,90,43,0.35), transparent 70%), radial-gradient(circle at 50% 55%, #1f4a38 0%, #163528 55%, #0f241c 100%)",
          }}
          aria-label="Diamond"
        >
          <polygon
            points="200,95 305,200 200,305 95,200"
            fill="rgba(139,90,43,0.28)"
          />
          <line
            x1="200"
            y1="320"
            x2="55"
            y2="120"
            stroke="rgba(232,228,217,0.35)"
            strokeWidth="1.5"
          />
          <line
            x1="200"
            y1="320"
            x2="345"
            y2="120"
            stroke="rgba(232,228,217,0.35)"
            strokeWidth="1.5"
          />
          <circle cx="200" cy="200" r="14" fill="rgba(139,90,43,0.55)" />
          <BasePad cx={310} cy={200} on={!!bases[0]} />
          <BasePad cx={200} cy={126} on={!!bases[1]} />
          <BasePad cx={126} cy={200} on={!!bases[2]} />
          <polygon
            points="200,318 214,304 214,292 186,292 186,304"
            fill="rgba(232,228,217,0.55)"
            stroke="rgba(232,228,217,0.7)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <p className="mb-1 text-center font-mono text-[10px] uppercase tracking-widest text-[var(--fog)]">
        {play?.pitcher ? `Pitching · ${play.pitcher}` : "\u00a0"}
      </p>
      <p
        className={`mb-4 min-h-[3rem] text-center text-lg leading-snug ${
          play && isBigPlay(play.text) ? "text-[var(--foul)]" : ""
        }`}
      >
        {play?.text ?? "Play ball…"}
      </p>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="border border-[var(--line)] px-3 py-2 font-mono text-xs uppercase tracking-wider text-[var(--chalk)] hover:border-[var(--foul)] hover:text-[var(--foul)]"
          onClick={() => {
            if (done) return;
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="border border-[var(--line)] px-3 py-2 font-mono text-xs uppercase tracking-wider text-[var(--chalk)] hover:border-[var(--foul)] hover:text-[var(--foul)]"
          onClick={() => {
            setPlaying(false);
            setIdx((i) => {
              if (i >= plays.length - 1) {
                setDone(true);
                return i;
              }
              const next = i + 1;
              if (next >= plays.length - 1) setDone(true);
              return next;
            });
          }}
        >
          Step
        </button>
        <button
          type="button"
          className="border border-[var(--line)] px-3 py-2 font-mono text-xs uppercase tracking-wider text-[var(--chalk)] hover:border-[var(--foul)] hover:text-[var(--foul)]"
          onClick={() => {
            setPlaying(false);
            setIdx(plays.length - 1);
            setDone(true);
          }}
        >
          Skip to final
        </button>
        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--fog)]">
          Speed
          <input
            type="range"
            min={1}
            max={5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-24 accent-[var(--foul)]"
          />
        </label>
      </div>

      {done ? (
        <p className="mb-3 text-center font-mono text-sm text-[var(--foul)]">
          Final · {finalAway} – {finalHome}
        </p>
      ) : null}

      <div className="max-h-40 overflow-y-auto border border-[var(--line)] bg-black/20 px-3 py-2 font-mono text-xs leading-relaxed text-[var(--fog)]">
        {feed.map((p, i) => (
          <div
            key={`${p.inning}-${p.half}-${i}-${p.text}`}
            className={
              p.text.startsWith("===")
                ? "pt-1 text-[var(--foul)]"
                : i === feed.length - 1
                  ? "text-[var(--chalk)]"
                  : ""
            }
          >
            {p.text}
          </div>
        ))}
      </div>
    </section>
  );
}

function BasePad({ cx, cy, on }: { cx: number; cy: number; on: boolean }) {
  const s = 18;
  const points = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
  return (
    <polygon
      points={points}
      fill={on ? "var(--foul)" : "rgba(232,228,217,0.18)"}
      stroke={on ? "#f0b84a" : "rgba(232,228,217,0.35)"}
      strokeWidth="2"
    />
  );
}
