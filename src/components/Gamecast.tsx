"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

        <div className="gc-stage">
          <div className="gc-field-wrap">
            <GameField bit={bit} bases={bases} />
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
