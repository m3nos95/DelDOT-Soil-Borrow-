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

type BitMode = "bit16" | "bit64";

function speedMs(level: number) {
  return [1400, 1000, 700, 420, 220][Math.min(4, Math.max(0, level - 1))];
}

function isBigPlay(text: string) {
  return /homers|forcing in a run|run scores|runs score|steals|caught stealing|enters from the pen|double play|first to third|scores from/i.test(
    text,
  );
}

function PixelRunner({
  x,
  y,
  on,
  color,
}: {
  x: number;
  y: number;
  on: boolean;
  color: string;
}) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={on ? 1 : 0}
      style={{ transition: "opacity 0.12s steps(2)" }}
    >
      <rect x="4" y="0" width="8" height="6" fill="#f0c8a0" />
      <rect x="2" y="6" width="12" height="10" fill={color} />
      <rect x="2" y="16" width="5" height="6" fill="#1a2040" />
      <rect x="9" y="16" width="5" height="6" fill="#1a2040" />
    </g>
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
  const [bit, setBit] = useState<BitMode>("bit16");
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

  const bases = play?.bases ?? [false, false, false];
  const outs = play?.outs ?? 0;
  const feed = plays.slice(0, Math.max(0, idx + 1)).slice(-10);

  const chooseBit = (mode: BitMode) => {
    setBit(mode);
    try {
      localStorage.setItem("hardball-bit", mode);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className={`gc-root ${bit}`}>
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
          <svg
            viewBox="0 0 400 400"
            className="gc-field"
            aria-label="Diamond"
          >
            <defs>
              <pattern
                id="gcGrass16"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <rect width="16" height="16" fill="#1f6b3a" />
                <rect width="8" height="8" fill="#175530" />
                <rect x="8" y="8" width="8" height="8" fill="#175530" />
                <rect x="4" y="2" width="2" height="2" fill="#248044" />
                <rect x="12" y="10" width="2" height="2" fill="#248044" />
              </pattern>
              <radialGradient id="gcDirt64" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#d4a85a" />
                <stop offset="100%" stopColor="#8a6a2e" />
              </radialGradient>
            </defs>
            <polygon
              points="200,20 380,200 200,380 20,200"
              fill="url(#gcGrass16)"
            />
            <polygon
              points="200,8 392,200 200,392 8,200"
              fill="none"
              stroke="#3a2a18"
              strokeWidth="14"
            />
            <polygon
              points="200,14 386,200 200,386 14,200"
              fill="none"
              stroke="#5a4020"
              strokeWidth="4"
            />
            <line
              className="gc-foul"
              x1="200"
              y1="328"
              x2="48"
              y2="100"
            />
            <line
              className="gc-foul"
              x1="200"
              y1="328"
              x2="352"
              y2="100"
            />
            <polygon
              className="gc-dirt"
              points="200,108 292,200 200,292 108,200"
            />
            <circle cx="200" cy="200" r="16" className="gc-mound" />
            <circle cx="200" cy="200" r="4" fill="#f2eee0" />
            <BasePad cx={320} cy={200} on={!!bases[0]} />
            <BasePad cx={200} cy={120} on={!!bases[1]} />
            <BasePad cx={120} cy={200} on={!!bases[2]} />
            <polygon
              points="200,332 218,314 218,300 182,300 182,314"
              fill="#f2eee0"
              stroke="#8a8470"
              strokeWidth="2"
            />
            <PixelRunner x={292} y={192} on={!!bases[0]} color="#e8a838" />
            <PixelRunner x={192} y={92} on={!!bases[1]} color="#c43c2a" />
            <PixelRunner x={92} y={192} on={!!bases[2]} color="#2a6ac4" />
          </svg>
        </div>

        <p className="gc-pitcher">
          {play?.pitcher ? `Pitching · ${play.pitcher}` : "\u00a0"}
        </p>
        <p
          className={`gc-play ${play && isBigPlay(play.text) ? "big" : ""}`}
          key={idx}
        >
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

function BasePad({ cx, cy, on }: { cx: number; cy: number; on: boolean }) {
  const s = 20;
  const points = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
  return (
    <polygon
      points={points}
      fill={on ? "#ffe066" : "#d8d0b8"}
      stroke={on ? "#fff3b0" : "#6a6048"}
      strokeWidth="2"
      style={
        on ? { filter: "drop-shadow(0 0 4px rgba(255,224,102,0.8))" } : undefined
      }
    />
  );
}
