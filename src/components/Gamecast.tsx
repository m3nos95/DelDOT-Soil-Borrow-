"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { GameField } from "@/components/GameField";
import { StrikeZone } from "@/components/StrikeZone";
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
type Phase = "pitch" | "result";

function resultMs(level: number) {
  return [1600, 1150, 800, 480, 260][Math.min(4, Math.max(0, level - 1))];
}
function pitchMs(level: number) {
  return [820, 600, 430, 270, 150][Math.min(4, Math.max(0, level - 1))];
}

function isBigPlay(text: string) {
  return /homers|forcing in a run|run scores|runs score|steals|caught stealing|enters from the pen|double play|first to third|scores from/i.test(
    text,
  );
}

function hasPitches(ev: PlayEvent | null | undefined) {
  return !!ev?.pitches && ev.pitches.length > 0;
}

const clampN = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/** Runs per inning for each side, derived live from the play feed. */
function computeLineScore(plays: PlayEvent[], upto: number) {
  const away: number[] = [];
  const home: number[] = [];
  let prevA = 0;
  let prevH = 0;
  for (let i = 0; i <= upto && i < plays.length; i++) {
    const ev = plays[i];
    const inn = ev.inning - 1;
    if (inn < 0) continue;
    const dA = ev.awayScore - prevA;
    const dH = ev.homeScore - prevH;
    if (dA > 0) away[inn] = (away[inn] ?? 0) + dA;
    if (dH > 0) home[inn] = (home[inn] ?? 0) + dH;
    // ensure the bucket exists once an inning is reached
    if (away[inn] === undefined) away[inn] = away[inn] ?? 0;
    prevA = ev.awayScore;
    prevH = ev.homeScore;
  }
  const innings = Math.max(away.length, home.length, 9);
  for (let i = 0; i < innings; i++) {
    if (away[i] === undefined) away[i] = i < (plays[upto]?.inning ?? 0) ? 0 : -1;
    if (home[i] === undefined) home[i] = i < (plays[upto]?.inning ?? 0) ? 0 : -1;
  }
  return { away, home, innings };
}

/** Lightweight home-team win probability from score, inning, half. */
function winProbHome(
  homeScore: number,
  awayScore: number,
  inning: number,
  half: "top" | "bottom",
): number {
  const diff = homeScore - awayScore;
  const inningsLeft = Math.max(0, 9 - inning) + (half === "top" ? 0.5 : 0);
  const spread = Math.max(0.7, Math.sqrt(inningsLeft + 0.5));
  const k = 1.15;
  let wp = 1 / (1 + Math.exp((-diff * k) / spread));
  if (diff === 0) wp = 0.5 + (half === "bottom" ? 0.03 : 0);
  return clampN(wp, 0.02, 0.98);
}

function battedTarget(text: string, idx: number): { x: number; y: number } | null {
  const side = idx % 2 === 0 ? 1 : -1;
  if (/homers/.test(text)) return { x: 50 + side * 6, y: 8 };
  if (/triples/.test(text)) return { x: 50 + side * 30, y: 20 };
  if (/doubles/.test(text)) return { x: 50 + side * 26, y: 26 };
  if (/flies out|sacrifice|scores from third/.test(text))
    return { x: 50 + side * 20, y: 24 };
  if (/lines|singles/.test(text)) return { x: 50 + side * 22, y: 42 };
  if (/grounds|double play|reaches on an error/.test(text))
    return { x: 50 + side * 16, y: 58 };
  return null;
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
  const [pitchIdx, setPitchIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("result");
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(3);
  const [done, setDone] = useState(false);
  const [bit, setBit] = useState<BitMode>("bit64");
  const [broadcast, setBroadcast] = useState(true);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    try {
      const savedBit = localStorage.getItem("hardball-bit");
      if (savedBit === "bit16" || savedBit === "bit64") setBit(savedBit);
      const savedCast = localStorage.getItem("hardball-broadcast");
      if (savedCast === "0") setBroadcast(false);
    } catch {
      /* ignore */
    }
  }, []);

  const cur = idx >= 0 ? plays[idx] : null;

  // Enter a fresh event: start pitch sub-steps when broadcasting a PA.
  const enterEvent = useCallback(
    (newIdx: number) => {
      setIdx(newIdx);
      const ev = plays[newIdx];
      if (broadcast && hasPitches(ev)) {
        setPhase("pitch");
        setPitchIdx(0);
      } else {
        setPhase("result");
        setPitchIdx(0);
        if (newIdx >= plays.length - 1) {
          setDone(true);
          setPlaying(false);
        }
      }
    },
    [broadcast, plays],
  );

  const step = useCallback(() => {
    if (plays.length === 0) return;
    if (idx < 0) {
      enterEvent(0);
      return;
    }
    const ev = plays[idx];
    const pcount = broadcast && hasPitches(ev) ? ev!.pitches!.length : 0;
    if (phase === "pitch") {
      if (pitchIdx < pcount - 1) {
        setPitchIdx((p) => p + 1);
      } else {
        setPhase("result");
        if (idx >= plays.length - 1) {
          setDone(true);
          setPlaying(false);
        }
      }
      return;
    }
    // result phase → advance to the next event
    if (idx >= plays.length - 1) {
      setDone(true);
      setPlaying(false);
      return;
    }
    enterEvent(idx + 1);
  }, [broadcast, enterEvent, idx, phase, pitchIdx, plays]);

  useEffect(() => {
    if (!playing || done || plays.length === 0) return;
    const inPitch = phase === "pitch" && broadcast && hasPitches(cur);
    const ms = inPitch ? pitchMs(speedRef.current) : resultMs(speedRef.current);
    const t = window.setTimeout(step, ms);
    return () => window.clearTimeout(t);
  }, [playing, done, plays.length, phase, pitchIdx, idx, broadcast, cur, step]);

  const showResult = phase === "result" || !broadcast || !hasPitches(cur);

  // Situation shown: during a live at-bat, show the pre-PA state (prev event).
  const sitEv = showResult ? cur : (idx > 0 ? plays[idx - 1] : cur);
  const bases = (sitEv?.bases ?? [false, false, false]) as [
    boolean,
    boolean,
    boolean,
  ];
  const outs = sitEv?.outs ?? 0;
  const awayScore = sitEv?.awayScore ?? 0;
  const homeScore = sitEv?.homeScore ?? 0;

  const feed = plays.slice(0, Math.max(0, idx + 1)).slice(-10);
  const big = !!(cur && showResult && isBigPlay(cur.text));

  // Count for the strike-zone panel
  let dispBalls = 0;
  let dispStrikes = 0;
  const pv = cur?.pitches;
  if (pv && pv.length > 0) {
    const shownN = showResult ? pv.length : pitchIdx + 1;
    const lastShown = pv[Math.min(shownN, pv.length) - 1];
    if (shownN < pv.length) {
      dispBalls = pv[shownN].balls;
      dispStrikes = pv[shownN].strikes;
    } else if (lastShown) {
      dispBalls = lastShown.balls + (lastShown.result === "ball" ? 1 : 0);
      dispStrikes =
        lastShown.strikes +
        (lastShown.result === "called" ||
        lastShown.result === "swinging" ||
        (lastShown.result === "foul" && lastShown.strikes < 2)
          ? 1
          : 0);
    }
  }

  const inLiveAB = broadcast && hasPitches(cur) && !showResult;
  const abLine = inLiveAB
    ? `${cur?.batter ?? "Batter"} at the plate`
    : (cur?.text ?? "Play ball…");

  // Line score + win probability (live from the feed)
  const line = computeLineScore(plays, Math.max(0, idx));
  const wpInning = cur?.inning ?? 1;
  const wpHalf = cur?.half ?? "top";
  const wpHome = winProbHome(
    cur?.homeScore ?? 0,
    cur?.awayScore ?? 0,
    wpInning,
    wpHalf,
  );
  const wpHomePct = Math.round(wpHome * 100);

  // Ball-in-play flight overlay (only on the result reveal of a batted ball)
  const batted = showResult && cur ? battedTarget(cur.text, idx) : null;

  const chooseBit = (mode: BitMode) => {
    setBit(mode);
    try {
      localStorage.setItem("hardball-bit", mode);
    } catch {
      /* ignore */
    }
  };

  const toggleBroadcast = () => {
    setBroadcast((b) => {
      const next = !b;
      try {
        localStorage.setItem("hardball-broadcast", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const skipToFinal = () => {
    setPlaying(false);
    setPhase("result");
    setIdx(plays.length - 1);
    setPitchIdx(Math.max(0, (plays[plays.length - 1]?.pitches?.length ?? 1) - 1));
    setDone(true);
  };

  return (
    <section className={`gc-root ${bit}${big ? " gc-big-moment" : ""}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-pixel)] text-xl tracking-wide text-[var(--bit-edge)] sm:text-2xl">
          Gamecast
        </h2>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`gc-bit-btn ${broadcast ? "on" : ""}`}
            onClick={toggleBroadcast}
            title="Pitch-by-pitch broadcast"
          >
            Broadcast
          </button>
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
            <div className="gc-score">{awayScore}</div>
          </div>
          <div className="gc-mid">
            <div>
              {cur
                ? `${cur.half === "top" ? "Top" : "Bot"} ${cur.inning}`
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
            <div className="gc-score">{homeScore}</div>
          </div>
        </div>

        <div className="gc-linescore">
          <table>
            <thead>
              <tr>
                <th></th>
                {Array.from({ length: line.innings }).map((_, i) => (
                  <th key={i}>{i + 1}</th>
                ))}
                <th className="gc-ls-total">R</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{awayAbbr}</td>
                {line.away.map((r, i) => (
                  <td key={i}>{r < 0 ? "" : r}</td>
                ))}
                <td className="gc-ls-total">{cur?.awayScore ?? 0}</td>
              </tr>
              <tr>
                <td>{homeAbbr}</td>
                {line.home.map((r, i) => (
                  <td key={i}>{r < 0 ? "" : r}</td>
                ))}
                <td className="gc-ls-total">{cur?.homeScore ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="gc-wp" aria-label="Win probability">
          <div className="gc-wp-bar">
            <span className="gc-wp-fill" style={{ width: `${wpHomePct}%` }} />
          </div>
          <div className="gc-wp-labels">
            <span>
              {homeAbbr} {wpHomePct}%
            </span>
            <span>
              {awayAbbr} {100 - wpHomePct}%
            </span>
          </div>
        </div>

        <div className="gc-stage">
          <div className="gc-field-wrap">
            <GameField bit={bit} bases={bases} />
            {batted ? (
              <span
                key={`ball-${idx}`}
                className="gc-ball"
                style={
                  {
                    "--bx": `${batted.x}%`,
                    "--by": `${batted.y}%`,
                  } as CSSProperties
                }
              />
            ) : null}
          </div>
          {broadcast ? (
            <StrikeZone
              pitches={pv ?? []}
              shown={showResult ? (pv?.length ?? 0) : pitchIdx + 1}
              balls={dispBalls}
              strikes={dispStrikes}
            />
          ) : null}
        </div>

        <p className="gc-pitcher">
          {cur?.pitcher ? `Pitching · ${cur.pitcher}` : "\u00a0"}
        </p>
        <p
          className={`gc-play ${big ? "big" : ""}${inLiveAB ? " live" : ""}`}
          key={`${idx}-${showResult ? "r" : pitchIdx}`}
        >
          {abLine}
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
              step();
            }}
          >
            {broadcast ? "Pitch" : "Step"}
          </button>
          <button type="button" className="gc-ctrl" onClick={skipToFinal}>
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
