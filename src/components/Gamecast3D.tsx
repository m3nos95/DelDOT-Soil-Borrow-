"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
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

type Phase = "pitch" | "result";

const AWAY_COLOR = "#e8a838";
const HOME_COLOR = "#3a7ad4";

// —— Field coordinates (world units) ——
const HOME: [number, number, number] = [0, 0, 0];
const MOUND: [number, number, number] = [0, 0, 12];
const BASE1: [number, number, number] = [11, 0, 11];
const BASE2: [number, number, number] = [0, 0, 22];
const BASE3: [number, number, number] = [-11, 0, 11];

const FIELDERS: [number, number, number][] = [
  [0, 0, 11.5], // P
  [0, 0, -1.6], // C
  [12.5, 0, 10], // 1B
  [6.5, 0, 17], // 2B
  [-6.5, 0, 17], // SS
  [-12.5, 0, 10], // 3B
  [-20, 0, 34], // LF
  [0, 0, 41], // CF
  [20, 0, 34], // RF
];

function resultMs(level: number) {
  return [1600, 1150, 800, 480, 260][Math.min(4, Math.max(0, level - 1))];
}
function pitchMs(level: number) {
  return [820, 600, 430, 270, 150][Math.min(4, Math.max(0, level - 1))];
}
function hasPitches(ev: PlayEvent | null | undefined) {
  return !!ev?.pitches && ev.pitches.length > 0;
}
function isBigPlay(text: string) {
  return /homers|forcing in a run|run scores|runs score|steals|double play|first to third|scores from/i.test(
    text,
  );
}

type BallAnim = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
  dur: number;
  arc: number; // peak height added mid-flight
} | null;

function battedTarget(text: string, idx: number): [number, number, number] | null {
  const s = idx % 2 === 0 ? 1 : -1;
  if (/homers/.test(text)) return [s * 8, 7, 52];
  if (/triples/.test(text)) return [s * 24, 3, 42];
  if (/doubles/.test(text)) return [s * 22, 3, 36];
  if (/flies out|sacrifice|scores from third/.test(text)) return [s * 16, 6, 30];
  if (/lines|singles/.test(text)) return [s * 18, 2, 24];
  if (/grounds|double play|reaches on an error/.test(text)) return [s * 10, 0.5, 16];
  return null;
}

function Player({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.55, 1.3, 4, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 2.25, 0]} castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial color="#e8c4a0" />
      </mesh>
    </group>
  );
}

function Base({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], 0.12, position[2]]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
      <planeGeometry args={[1.3, 1.3]} />
      <meshStandardMaterial color="#f2eee0" />
    </mesh>
  );
}

function FoulLine({ to }: { to: [number, number, number] }) {
  const len = Math.hypot(to[0], to[2]);
  const angle = Math.atan2(to[0], to[2]);
  return (
    <mesh
      position={[to[0] / 2, 0.14, to[2] / 2]}
      rotation={[-Math.PI / 2, 0, -angle]}
    >
      <planeGeometry args={[0.35, len]} />
      <meshStandardMaterial color="#f2eee0" />
    </mesh>
  );
}

function Ball({ animRef }: { animRef: React.MutableRefObject<BallAnim> }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const mesh = ref.current;
    const a = animRef.current;
    if (!mesh) return;
    if (!a) {
      mesh.visible = false;
      return;
    }
    const t = (performance.now() - a.start) / a.dur;
    if (t >= 1) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const x = THREE.MathUtils.lerp(a.from.x, a.to.x, t);
    const y = THREE.MathUtils.lerp(a.from.y, a.to.y, t) + a.arc * Math.sin(Math.PI * t);
    const z = THREE.MathUtils.lerp(a.from.z, a.to.z, t);
    mesh.position.set(x, y, z);
  });
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.35, 16, 16]} />
      <meshStandardMaterial color="#ffffff" emissive="#8a8a6a" emissiveIntensity={0.4} />
    </mesh>
  );
}

function Field() {
  return (
    <group>
      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 20]} receiveShadow>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color="#1a5a30" />
      </mesh>
      {/* Infield dirt diamond */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.02, 11]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#b5793f" />
      </mesh>
      {/* Mound */}
      <mesh position={[MOUND[0], 0.15, MOUND[2]]}>
        <cylinderGeometry args={[2.2, 2.6, 0.35, 20]} />
        <meshStandardMaterial color="#8a6a2e" />
      </mesh>
      {/* Home plate */}
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 1.1]} />
        <meshStandardMaterial color="#f2eee0" />
      </mesh>
      <Base position={BASE1} />
      <Base position={BASE2} />
      <Base position={BASE3} />
      <FoulLine to={[34, 0, 34]} />
      <FoulLine to={[-34, 0, 34]} />
      {/* Outfield wall (curved) */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry
          args={[49, 49, 3, 48, 1, true, -Math.PI / 4, Math.PI / 2]}
        />
        <meshStandardMaterial color="#123024" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Scene({
  event,
  showResult,
  bases,
  battingHome,
  animRef,
}: {
  event: PlayEvent | null;
  showResult: boolean;
  bases: [boolean, boolean, boolean];
  battingHome: boolean;
  animRef: React.MutableRefObject<BallAnim>;
}) {
  const batColor = battingHome ? HOME_COLOR : AWAY_COLOR;
  const fieldColor = battingHome ? AWAY_COLOR : HOME_COLOR;
  const runnerSpots: [number, number, number][] = [];
  if (bases[0]) runnerSpots.push(BASE1);
  if (bases[1]) runnerSpots.push(BASE2);
  if (bases[2]) runnerSpots.push(BASE3);

  return (
    <>
      <color attach="background" args={["#060d16"]} />
      <fog attach="fog" args={["#060d16", 55, 110]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[20, 40, 10]} intensity={1.1} castShadow />
      <directionalLight position={[-25, 35, 40]} intensity={0.6} color="#ffe9b0" />
      <pointLight position={[0, 30, 5]} intensity={0.5} color="#cfe4ff" />

      <Field />

      {/* Fielders */}
      {FIELDERS.map((p, i) => (
        <Player key={`f${i}`} position={p} color={fieldColor} />
      ))}
      {/* Batter at the plate */}
      <Player position={[1.2, 0, 0.2]} color={batColor} />
      {/* Runners */}
      {runnerSpots.map((p, i) => (
        <Player key={`r${i}`} position={[p[0], 0, p[2]]} color={batColor} />
      ))}

      <Ball animRef={animRef} />

      <OrbitControls
        enablePan={false}
        minDistance={18}
        maxDistance={70}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 2.5, 10]}
      />
    </>
  );
}

export function Gamecast3D({
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
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const animRef = useRef<BallAnim>(null);

  const cur = idx >= 0 ? plays[idx] : null;

  const enterEvent = useCallback(
    (newIdx: number) => {
      setIdx(newIdx);
      const ev = plays[newIdx];
      if (hasPitches(ev)) {
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
    [plays],
  );

  const step = useCallback(() => {
    if (plays.length === 0) return;
    if (idx < 0) {
      enterEvent(0);
      return;
    }
    const ev = plays[idx];
    const pcount = hasPitches(ev) ? ev!.pitches!.length : 0;
    if (phase === "pitch") {
      if (pitchIdx < pcount - 1) setPitchIdx((p) => p + 1);
      else {
        setPhase("result");
        if (idx >= plays.length - 1) {
          setDone(true);
          setPlaying(false);
        }
      }
      return;
    }
    if (idx >= plays.length - 1) {
      setDone(true);
      setPlaying(false);
      return;
    }
    enterEvent(idx + 1);
  }, [enterEvent, idx, phase, pitchIdx, plays]);

  useEffect(() => {
    if (!playing || done || plays.length === 0) return;
    const inPitch = phase === "pitch" && hasPitches(cur);
    const ms = inPitch ? pitchMs(speedRef.current) : resultMs(speedRef.current);
    const t = window.setTimeout(step, ms);
    return () => window.clearTimeout(t);
  }, [playing, done, plays.length, phase, pitchIdx, idx, cur, step]);

  const showResult = phase === "result" || !hasPitches(cur);

  // Trigger ball animations on transitions
  useEffect(() => {
    if (!cur) return;
    if (phase === "pitch" && cur.pitches && cur.pitches[pitchIdx]) {
      const p = cur.pitches[pitchIdx];
      animRef.current = {
        from: new THREE.Vector3(0, 5.5, 11),
        to: new THREE.Vector3(p.x * 0.9, 2.2 + p.y * 0.9, 0.4),
        start: performance.now(),
        dur: Math.max(220, pitchMs(speedRef.current) * 0.8),
        arc: 0.6,
      };
    } else if (phase === "result") {
      const target = battedTarget(cur.text, idx);
      if (target) {
        animRef.current = {
          from: new THREE.Vector3(0, 1.2, 0.5),
          to: new THREE.Vector3(...target),
          start: performance.now(),
          dur: 850,
          arc: target[1] > 4 ? 6 : 2,
        };
      }
    }
  }, [phase, pitchIdx, idx, cur]);

  const sitEv = showResult ? cur : idx > 0 ? plays[idx - 1] : cur;
  const bases = (sitEv?.bases ?? [false, false, false]) as [
    boolean,
    boolean,
    boolean,
  ];
  const outs = sitEv?.outs ?? 0;
  const awayScore = sitEv?.awayScore ?? 0;
  const homeScore = sitEv?.homeScore ?? 0;
  const battingHome = (cur?.half ?? "top") === "bottom";
  const big = !!(cur && showResult && isBigPlay(cur.text));

  let dispBalls = 0;
  let dispStrikes = 0;
  const pv = cur?.pitches;
  if (pv && pv.length > 0) {
    const shownN = showResult ? pv.length : pitchIdx + 1;
    const last = pv[Math.min(shownN, pv.length) - 1];
    if (shownN < pv.length) {
      dispBalls = pv[shownN].balls;
      dispStrikes = pv[shownN].strikes;
    } else if (last) {
      dispBalls = last.balls + (last.result === "ball" ? 1 : 0);
      dispStrikes =
        last.strikes +
        (last.result === "called" ||
        last.result === "swinging" ||
        (last.result === "foul" && last.strikes < 2)
          ? 1
          : 0);
    }
  }

  const inLiveAB = hasPitches(cur) && !showResult;
  const abLine = inLiveAB
    ? `${cur?.batter ?? "Batter"} at the plate`
    : (cur?.text ?? "Play ball…");

  return (
    <section className={`gc-root bit64${big ? " gc-big-moment" : ""}`}>
      <div className="gc-cart">
        <div className="gc-hud">
          <div>
            <div className="gc-team-label">{awayName}</div>
            <div className="gc-score">{awayScore}</div>
          </div>
          <div className="gc-mid">
            <div>
              {cur ? `${cur.half === "top" ? "Top" : "Bot"} ${cur.inning}` : "Top 1"}
            </div>
            <div className="gc-outs" aria-label="Outs">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < outs ? "on" : ""} />
              ))}
            </div>
            <div className="mt-1 text-[10px] opacity-70">
              {dispBalls}-{dispStrikes} · {awayAbbr} @ {homeAbbr}
            </div>
          </div>
          <div className="text-right">
            <div className="gc-team-label">{homeName}</div>
            <div className="gc-score">{homeScore}</div>
          </div>
        </div>

        <div className="gc3d-stage">
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 9, 44], fov: 42 }}
          >
            <Scene
              event={cur}
              showResult={showResult}
              bases={bases}
              battingHome={battingHome}
              animRef={animRef}
            />
          </Canvas>
          <div className="gc3d-hint">drag to look · scroll to zoom</div>
        </div>

        <p className="gc-pitcher">
          {cur?.pitcher ? `Pitching · ${cur.pitcher}` : "\u00a0"}
        </p>
        <p className={`gc-play ${big ? "big" : ""}${inLiveAB ? " live" : ""}`} key={`${idx}-${showResult ? "r" : pitchIdx}`}>
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
            Pitch
          </button>
          <button
            type="button"
            className="gc-ctrl"
            onClick={() => {
              setPlaying(false);
              setPhase("result");
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
          <p className="mb-1 text-center font-[family-name:var(--font-pixel)] text-sm text-[var(--bit-edge)]">
            Final · {finalAway} – {finalHome}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default Gamecast3D;
