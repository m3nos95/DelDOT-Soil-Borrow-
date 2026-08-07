"use client";

import { useEffect, useRef, useState } from "react";
import { GameField } from "@/components/GameField";
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

type BitMode = "bit16" | "bit64";

function speedMs(level: number) {
  return [1400, 1000, 700, 420, 220][Math.min(4, Math.max(0, level - 1))];
}

function isBigPlay(text: string) {
  return /homers|forcing in a run|run scores|runs score|steals|caught stealing|enters from the pen|double play|first to third|scores from/i.test(
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
  const [bit, setBit] = useState<BitMode>("bit64");
  const speedRef = useRef(speed);

  speedRef.current = speed;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hardball-bit");
      if (saved === "bit16" || saved === "bit64") setBit(saved);
    } catch {
      /* ignore */
    }
  }, []);

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

  const bases = (play?.bases ?? [false, false, false]) as [
    boolean,
    boolean,
    boolean,
  ];
  const outs = play?.outs ?? 0;
  const feed = plays.slice(0, Math.max(0, idx + 1)).slice(-10);
  const big = !!(play && isBigPlay(play.text));

  const chooseBit = (mode: BitMode) => {
    setBit(mode);
    try {
      localStorage.setItem("hardball-bit", mode);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className={`gc-root ${bit}${big ? " gc-big-moment" : ""}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-pixel)] text-xl tracking-wide text-[var(--bit-edge)] sm:text-2xl">
          Gamecast
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            className={`gc-bit-btn ${bit === "bit16" ? "on" : ""}`}
            onClick={() => chooseBit("bit16")}
          >
            16-bit
          </button>
          <button
            type="button"
            className={`gc-bit-btn ${bit === "bit64" ? "on" : ""}`}
            onClick={() => chooseBit("bit64")}
          >
            64-bit
          </button>
        </div>
      </div>

      <div className="gc-cart">
        <div className="gc-hud">
          <div>
            <div className="gc-team-label">{awayName}</div>
            <div className="gc-score">{play?.awayScore ?? 0}</div>
          </div>
          <div className="gc-mid">
            <div>
              {play
                ? `${play.half === "top" ? "Top" : "Bot"} ${play.inning}`
                : "Top 1"}
            </div>
            <div className="gc-outs" aria-label="Outs">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < outs ? "on" : ""} />
              ))}
            </div>
            <div className="mt-1 text-[10px] opacity-70">
              {awayAbbr} @ {homeAbbr}
            </div>
          </div>
          <div className="text-right">
            <div className="gc-team-label">{homeName}</div>
            <div className="gc-score">{play?.homeScore ?? 0}</div>
          </div>
        </div>

        <div className="gc-field-wrap">
          <GameField bit={bit} bases={bases} />
        </div>

        <p className="gc-pitcher">
          {play?.pitcher ? `Pitching · ${play.pitcher}` : "\u00a0"}
        </p>
        <p className={`gc-play ${big ? "big" : ""}`} key={idx}>
          {play?.text ?? "Play ball…"}
        </p>

        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="gc-ctrl"
            onClick={() => {
              if (done) return;
              setPlaying((p) => !p);
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="gc-ctrl"
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
            className="gc-ctrl"
            onClick={() => {
              setPlaying(false);
              setIdx(plays.length - 1);
              setDone(true);
            }}
          >
            Skip to final
          </button>
          <label className="flex items-center gap-2 font-[family-name:var(--font-pixel)] text-[10px] uppercase tracking-wider text-[#8aa090]">
            Speed
            <input
              type="range"
              min={1}
              max={5}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-24 accent-[var(--bit-edge)]"
            />
          </label>
        </div>

        {done ? (
          <p className="mb-3 text-center font-[family-name:var(--font-pixel)] text-sm text-[var(--bit-edge)]">
            Final · {finalAway} – {finalHome}
          </p>
        ) : null}

        <div className="gc-feed">
          {feed.map((p, i) => (
            <div
              key={`${p.inning}-${p.half}-${i}-${p.text}`}
              className={
                p.text.startsWith("===")
                  ? "text-[var(--bit-edge)]"
                  : i === feed.length - 1
                    ? "text-[#fff6c8]"
                    : ""
              }
            >
              {p.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
