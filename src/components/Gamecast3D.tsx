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
const AWAY_CAP = "#b87c1e";
const HOME_CAP = "#28518f";

// —— Field coordinates (world units) ——
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
  arc: number;
  kind: "pitch" | "batted";
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

// —— Procedural grass texture with mow stripes ——
function useGrassTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#1b5a31";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 32) {
      ctx.fillStyle = (i / 32) % 2 === 0 ? "#1f6636" : "#184f2b";
      ctx.fillRect(0, i, 256, 32);
    }
    // speckle
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }, []);
}

function Player({
  position,
  color,
  cap,
  phase,
  role,
  animRef,
}: {
  position: [number, number, number];
  color: string;
  cap: string;
  phase: number;
  role: "field" | "bat" | "pitch" | "run";
  animRef: React.MutableRefObject<BallAnim>;
}) {
  const g = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (g.current) g.current.position.y = Math.sin(t * 2 + phase) * 0.05;
    if (!inner.current) return;
    const a = animRef.current;
    const prog = a ? (performance.now() - a.start) / a.dur : 2;
    if (role === "pitch" && a?.kind === "pitch" && prog < 0.5) {
      inner.current.rotation.x = -0.5 * Math.sin(Math.PI * (prog / 0.5));
    } else if (role === "bat" && a?.kind === "batted" && prog < 0.35) {
      inner.current.rotation.y = -1.6 * (prog / 0.35);
    } else {
      inner.current.rotation.x *= 0.8;
      inner.current.rotation.y *= 0.8;
    }
  });
  return (
    <group ref={g} position={position}>
      <group ref={inner}>
        <mesh position={[0, 1.15, 0]} castShadow>
          <capsuleGeometry args={[0.5, 1.3, 4, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, 2.25, 0]} castShadow>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshStandardMaterial color="#e8c4a0" />
        </mesh>
        {/* cap */}
        <mesh position={[0, 2.55, 0]}>
          <sphereGeometry args={[0.44, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={cap} />
        </mesh>
        <mesh position={[0, 2.5, 0.4]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.5, 0.06, 0.35]} />
          <meshStandardMaterial color={cap} />
        </mesh>
      </group>
    </group>
  );
}

function Base({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={[position[0], 0.14, position[2]]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
      <planeGeometry args={[1.2, 1.2]} />
      <meshStandardMaterial color="#f6f2e6" />
    </mesh>
  );
}

// A dirt path segment between two points
function DirtPath({
  a,
  b,
  width = 2.2,
}: {
  a: [number, number, number];
  b: [number, number, number];
  width?: number;
}) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  return (
    <mesh
      position={[(a[0] + b[0]) / 2, 0.05, (a[2] + b[2]) / 2]}
      rotation={[-Math.PI / 2, 0, -angle]}
    >
      <planeGeometry args={[width, len]} />
      <meshStandardMaterial color="#b5793f" />
    </mesh>
  );
}

function Field() {
  const grass = useGrassTexture();
  return (
    <group>
      {/* Grass field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 20]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial map={grass} />
      </mesh>
      {/* Infield dirt skin (arc behind the infield) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 11]}>
        <circleGeometry args={[19, 48, 0, Math.PI]} />
        <meshStandardMaterial color="#a86f38" />
      </mesh>
      {/* Infield grass on top of the skin */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.05, 11]}>
        <planeGeometry args={[15, 15]} />
        <meshStandardMaterial map={grass} />
      </mesh>
      {/* Base paths */}
      <DirtPath a={[0, 0, 0]} b={BASE1} />
      <DirtPath a={BASE1} b={BASE2} />
      <DirtPath a={BASE2} b={BASE3} />
      <DirtPath a={BASE3} b={[0, 0, 0]} />
      {/* Home + mound circles */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[3, 24]} />
        <meshStandardMaterial color="#b5793f" />
      </mesh>
      <mesh position={[MOUND[0], 0.15, MOUND[2]]} receiveShadow castShadow>
        <cylinderGeometry args={[2.4, 2.8, 0.4, 24]} />
        <meshStandardMaterial color="#8a6a2e" />
      </mesh>
      <mesh position={[MOUND[0], 0.36, MOUND[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 0.25]} />
        <meshStandardMaterial color="#f6f2e6" />
      </mesh>
      {/* Home plate */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.0, 1.0]} />
        <meshStandardMaterial color="#f6f2e6" />
      </mesh>
      <Base position={BASE1} />
      <Base position={BASE2} />
      <Base position={BASE3} />
      {/* Foul lines */}
      {[[34, 0, 34], [-34, 0, 34]].map((to, i) => {
        const len = Math.hypot(to[0], to[2]);
        const angle = Math.atan2(to[0], to[2]);
        return (
          <mesh
            key={i}
            position={[to[0] / 2, 0.09, to[2] / 2]}
            rotation={[-Math.PI / 2, 0, -angle]}
          >
            <planeGeometry args={[0.3, len]} />
            <meshStandardMaterial color="#f4efe4" />
          </mesh>
        );
      })}
      {/* Foul poles */}
      {[[34, 34], [-34, 34]].map(([x, z], i) => (
        <mesh key={i} position={[x, 6, z]}>
          <cylinderGeometry args={[0.2, 0.2, 12, 8]} />
          <meshStandardMaterial color="#f0d24a" emissive="#8a7420" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* Warning track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[45, 48, 64, 1, -Math.PI / 4, Math.PI / 2 + 0.2]} />
        <meshStandardMaterial color="#9a5f30" />
      </mesh>
      {/* Outfield wall */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[48, 48, 3.2, 64, 1, true, -Math.PI / 4, Math.PI / 2 + 0.2]} />
        <meshStandardMaterial color="#123024" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <cylinderGeometry args={[48, 48, 0.25, 64, 1, true, -Math.PI / 4, Math.PI / 2 + 0.2]} />
        <meshStandardMaterial color="#f4efe4" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Stands() {
  return (
    <group>
      {/* Lower + upper tiers wrapping the outfield */}
      {[
        { r: 56, y: 5, h: 10, color: "#0e1a20" },
        { r: 66, y: 11, h: 12, color: "#0a141a" },
      ].map((t, i) => (
        <mesh key={i} position={[0, t.y, 0]}>
          <cylinderGeometry
            args={[t.r, t.r - 6, t.h, 64, 1, true, -Math.PI / 2, Math.PI * 1.05]}
          />
          <meshStandardMaterial color={t.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function LightTower({ x, z }: { x: number; z: number }) {
  const bank: [number, number, number][] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) bank.push([c * 0.9 - 1.35, r * 0.9 + 0.9, 0]);
  const face = Math.atan2(-x, -z);
  return (
    <group position={[x, 0, z]} rotation={[0, face, 0]}>
      <mesh position={[0, 11, 0]}>
        <cylinderGeometry args={[0.35, 0.5, 22, 8]} />
        <meshStandardMaterial color="#2a2f33" />
      </mesh>
      <mesh position={[0, 22.5, 0.3]}>
        <boxGeometry args={[4.2, 3.2, 0.4]} />
        <meshStandardMaterial color="#1a1f22" />
      </mesh>
      {bank.map((p, i) => (
        <mesh key={i} position={[p[0], 22.5 + p[1] - 1.8, 0.55]}>
          <boxGeometry args={[0.7, 0.7, 0.2]} />
          <meshStandardMaterial
            color="#fff6d0"
            emissive="#fff0b0"
            emissiveIntensity={2.2}
          />
        </mesh>
      ))}
      <pointLight
        position={[0, 22, 1]}
        intensity={0.5}
        distance={120}
        color="#eaf2ff"
      />
    </group>
  );
}

function Scoreboard() {
  return (
    <group position={[0, 8, 50]}>
      <mesh>
        <boxGeometry args={[18, 7, 0.6]} />
        <meshStandardMaterial color="#0a0f14" />
      </mesh>
      <mesh position={[0, 0, 0.35]}>
        <planeGeometry args={[16.5, 5.5]} />
        <meshStandardMaterial color="#0d1a10" emissive="#123a1a" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 2.6, 0.4]}>
        <planeGeometry args={[16.5, 0.3]} />
        <meshStandardMaterial color="#e8b84a" emissive="#e8b84a" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function StarSky() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 400;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi) + 10;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#cfe0ff" size={0.5} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

function Scene({
  bases,
  battingHome,
  animRef,
}: {
  bases: [boolean, boolean, boolean];
  battingHome: boolean;
  animRef: React.MutableRefObject<BallAnim>;
}) {
  const batColor = battingHome ? HOME_COLOR : AWAY_COLOR;
  const batCap = battingHome ? HOME_CAP : AWAY_CAP;
  const fieldColor = battingHome ? AWAY_COLOR : HOME_COLOR;
  const fieldCap = battingHome ? AWAY_CAP : HOME_CAP;
  const runnerSpots: [number, number, number][] = [];
  if (bases[0]) runnerSpots.push(BASE1);
  if (bases[1]) runnerSpots.push(BASE2);
  if (bases[2]) runnerSpots.push(BASE3);

  const ball = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const mesh = ball.current;
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
    mesh.position.set(
      THREE.MathUtils.lerp(a.from.x, a.to.x, t),
      THREE.MathUtils.lerp(a.from.y, a.to.y, t) + a.arc * Math.sin(Math.PI * t),
      THREE.MathUtils.lerp(a.from.z, a.to.z, t),
    );
  });

  return (
    <>
      <color attach="background" args={["#050a12"]} />
      <fog attach="fog" args={["#050a12", 70, 130]} />
      <hemisphereLight args={["#3a4a66", "#0c1a12", 0.5]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[25, 45, 15]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-30, 40, 45]} intensity={0.5} color="#ffe9b0" />

      <StarSky />
      <Stands />
      <LightTower x={-32} z={44} />
      <LightTower x={32} z={44} />
      <LightTower x={-48} z={18} />
      <LightTower x={48} z={18} />
      <Scoreboard />
      <Field />

      {FIELDERS.map((p, i) => (
        <Player
          key={`f${i}`}
          position={p}
          color={fieldColor}
          cap={fieldCap}
          phase={i * 1.3}
          role={i === 0 ? "pitch" : "field"}
          animRef={animRef}
        />
      ))}
      <Player
        position={[1.3, 0, 0.3]}
        color={batColor}
        cap={batCap}
        phase={0.5}
        role="bat"
        animRef={animRef}
      />
      {runnerSpots.map((p, i) => (
        <Player
          key={`r${i}`}
          position={[p[0], 0, p[2]]}
          color={batColor}
          cap={batCap}
          phase={i * 2.1 + 1}
          role="run"
          animRef={animRef}
        />
      ))}

      <mesh ref={ball} visible={false}>
        <sphereGeometry args={[0.34, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#9a9a7a" emissiveIntensity={0.5} />
      </mesh>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={16}
        maxDistance={90}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 2.5, 11]}
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
        kind: "pitch",
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
          kind: "batted",
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
            camera={{ position: [0, 10, 46], fov: 40 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            <Scene
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
