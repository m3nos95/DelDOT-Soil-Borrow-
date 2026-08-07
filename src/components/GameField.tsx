"use client";

import { useId } from "react";

type BitMode = "bit16" | "bit64";

export function GameField({
  bit,
  bases,
}: {
  bit: BitMode;
  bases: [boolean, boolean, boolean];
}) {
  const uid = useId().replace(/:/g, "");
  const g16 = `grass16-${uid}`;
  const g64 = `grass64-${uid}`;
  const dirt64 = `dirt64-${uid}`;
  const sky64 = `sky64-${uid}`;
  const glow = `glow-${uid}`;
  const wall64 = `wall64-${uid}`;

  if (bit === "bit64") {
    return (
      <svg viewBox="0 0 400 400" className="gc-field" aria-label="Diamond">
        <defs>
          <radialGradient id={sky64} cx="50%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1a3048" />
            <stop offset="55%" stopColor="#0e1a2c" />
            <stop offset="100%" stopColor="#060c14" />
          </radialGradient>
          <linearGradient id={g64} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a6b3a" />
            <stop offset="45%" stopColor="#145530" />
            <stop offset="100%" stopColor="#0e4024" />
          </linearGradient>
          <pattern
            id={`${g64}-mow`}
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="28" height="28" fill="transparent" />
            <rect width="14" height="28" fill="rgba(0,0,0,0.12)" />
          </pattern>
          <radialGradient id={dirt64} cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#e0b868" />
            <stop offset="55%" stopColor="#c49a4a" />
            <stop offset="100%" stopColor="#7a5828" />
          </radialGradient>
          <linearGradient id={wall64} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a4028" />
            <stop offset="100%" stopColor="#2a1c10" />
          </linearGradient>
          <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="400" height="400" fill={`url(#${sky64})`} />

        {/* Soft flood */}
        <ellipse
          cx="200"
          cy="260"
          rx="180"
          ry="140"
          fill="rgba(255,220,120,0.08)"
        />

        {/* Outfield */}
        <polygon
          points="200,28 372,200 200,372 28,200"
          fill={`url(#${g64})`}
        />
        <polygon
          points="200,28 372,200 200,372 28,200"
          fill={`url(#${g64}-mow)`}
        />

        {/* Warning track */}
        <polygon
          points="200,40 360,200 200,360 40,200"
          fill="none"
          stroke="#b88848"
          strokeWidth="7"
          opacity="0.7"
        />

        {/* Wall */}
        <polygon
          points="200,18 382,200 200,382 18,200"
          fill="none"
          stroke={`url(#${wall64})`}
          strokeWidth="11"
        />

        {/* Foul lines */}
        <line
          x1="200"
          y1="330"
          x2="52"
          y2="105"
          stroke="rgba(245,240,225,0.85)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="200"
          y1="330"
          x2="348"
          y2="105"
          stroke="rgba(245,240,225,0.85)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Infield dirt */}
        <polygon
          points="200,105 295,200 200,295 105,200"
          fill={`url(#${dirt64})`}
        />
        <ellipse
          cx="200"
          cy="200"
          rx="88"
          ry="88"
          fill="none"
          stroke="rgba(40,70,40,0.25)"
          strokeWidth="14"
        />

        {/* Mound */}
        <ellipse cx="200" cy="200" rx="20" ry="14" fill="#8a6a2e" />
        <ellipse cx="200" cy="198" rx="7" ry="4" fill="#f2eee0" opacity="0.85" />

        {/* Fielders (subtle silhouettes) */}
        <Fielder64 x={200} y={78} />
        <Fielder64 x={318} y={200} />
        <Fielder64 x={82} y={200} />
        <Fielder64 x={130} y={130} />
        <Fielder64 x={270} y={130} />
        <Fielder64 x={95} y={95} />
        <Fielder64 x={305} y={95} />
        <Fielder64 x={200} y={55} />

        <BasePad64 cx={318} cy={200} on={!!bases[0]} glowId={glow} />
        <BasePad64 cx={200} cy={115} on={!!bases[1]} glowId={glow} />
        <BasePad64 cx={82} cy={200} on={!!bases[2]} glowId={glow} />

        {/* Home */}
        <polygon
          points="200,336 220,316 220,300 180,300 180,316"
          fill="#f4efe4"
          stroke="#8a8470"
          strokeWidth="1.5"
        />

        <Runner64 x={300} y={188} on={!!bases[0]} color="#e8a838" />
        <Runner64 x={188} y={95} on={!!bases[1]} color="#d44a3a" />
        <Runner64 x={70} y={188} on={!!bases[2]} color="#3a7ad4" />
      </svg>
    );
  }

  // —— 16-bit SNES-era diamond ——
  return (
    <svg viewBox="0 0 400 400" className="gc-field" aria-label="Diamond">
      <defs>
        <pattern id={g16} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#1a6b38" />
          <rect width="6" height="6" fill="#145530" />
          <rect x="6" y="6" width="6" height="6" fill="#145530" />
          <rect x="2" y="1" width="2" height="2" fill="#248844" />
          <rect x="8" y="7" width="2" height="2" fill="#2a9050" />
          <rect x="5" y="9" width="1" height="1" fill="#0e4024" />
        </pattern>
        <pattern
          id={`${g16}-wall`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="8" fill="#4a3020" />
          <rect width="8" height="2" fill="#3a2414" />
          <rect y="4" width="8" height="1" fill="#2a180c" />
        </pattern>
      </defs>

      <rect width="400" height="400" fill="#101828" />
      {/* Night sky dither */}
      <g fill="#1a2840">
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x={(i * 53) % 380}
            y={8 + (i % 3) * 7}
            width="2"
            height="2"
            opacity="0.5"
          />
        ))}
      </g>

      <polygon
        points="200,22 378,200 200,378 22,200"
        fill={`url(#${g16})`}
      />
      <polygon
        points="200,10 390,200 200,390 10,200"
        fill={`url(#${g16}-wall)`}
      />
      <polygon
        points="200,22 378,200 200,378 22,200"
        fill={`url(#${g16})`}
      />
      <polygon
        points="200,16 384,200 200,384 16,200"
        fill="none"
        stroke="#6a4820"
        strokeWidth="4"
      />

      {/* Warning track pixels */}
      <polygon
        points="200,36 362,200 200,364 38,200"
        fill="none"
        stroke="#c48838"
        strokeWidth="5"
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
      {/* Dirt highlight tiles */}
      <rect x="188" y="160" width="8" height="8" fill="#d4a85a" opacity="0.45" />
      <rect x="220" y="200" width="8" height="8" fill="#d4a85a" opacity="0.35" />
      <rect x="172" y="210" width="8" height="8" fill="#a87830" opacity="0.4" />

      <circle cx="200" cy="200" r="16" className="gc-mound" />
      <circle cx="200" cy="200" r="5" fill="#f2eee0" />

      {/* Pixel fielders */}
      <PixelFielder x={194} y={70} />
      <PixelFielder x={310} y={192} />
      <PixelFielder x={74} y={192} />
      <PixelFielder x={120} y={120} />
      <PixelFielder x={260} y={120} />
      <PixelFielder x={86} y={86} />
      <PixelFielder x={290} y={86} />
      <PixelFielder x={194} y={48} />

      <BasePad16 cx={320} cy={200} on={!!bases[0]} />
      <BasePad16 cx={200} cy={120} on={!!bases[1]} />
      <BasePad16 cx={120} cy={200} on={!!bases[2]} />

      <polygon
        points="200,332 218,314 218,300 182,300 182,314"
        fill="#f2eee0"
        stroke="#8a8470"
        strokeWidth="2"
      />

      <PixelRunner x={292} y={188} on={!!bases[0]} color="#e8a838" />
      <PixelRunner x={188} y={90} on={!!bases[1]} color="#c43c2a" />
      <PixelRunner x={88} y={188} on={!!bases[2]} color="#2a6ac4" />
    </svg>
  );
}

function BasePad16({ cx, cy, on }: { cx: number; cy: number; on: boolean }) {
  const s = 18;
  const points = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
  return (
    <polygon
      points={points}
      fill={on ? "#ffe066" : "#d8d0b8"}
      stroke={on ? "#fff3b0" : "#6a6048"}
      strokeWidth="2"
    />
  );
}

function BasePad64({
  cx,
  cy,
  on,
  glowId,
}: {
  cx: number;
  cy: number;
  on: boolean;
  glowId: string;
}) {
  const s = 17;
  const points = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;
  return (
    <polygon
      points={points}
      fill={on ? "#ffe066" : "#ebe4d2"}
      stroke={on ? "#fff8d0" : "#7a7460"}
      strokeWidth="1.5"
      filter={on ? `url(#${glowId})` : undefined}
    />
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
      <rect x="5" y="0" width="8" height="6" fill="#f0c8a0" />
      <rect x="3" y="6" width="12" height="11" fill={color} />
      <rect x="4" y="8" width="3" height="3" fill="rgba(255,255,255,0.25)" />
      <rect x="3" y="17" width="5" height="7" fill="#1a2040" />
      <rect x="10" y="17" width="5" height="7" fill="#1a2040" />
    </g>
  );
}

function Runner64({
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
      style={{ transition: "opacity 0.22s ease" }}
    >
      <ellipse cx="9" cy="22" rx="7" ry="2.5" fill="rgba(0,0,0,0.35)" />
      <circle cx="9" cy="5" r="4.5" fill="#e8c4a0" />
      <rect x="4" y="9" width="10" height="11" rx="2" fill={color} />
      <rect x="3" y="19" width="4.5" height="6" rx="1" fill="#1a2438" />
      <rect x="10.5" y="19" width="4.5" height="6" rx="1" fill="#1a2438" />
    </g>
  );
}

function PixelFielder({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} opacity="0.85">
      <rect x="4" y="0" width="6" height="5" fill="#d8b090" />
      <rect x="2" y="5" width="10" height="8" fill="#2a5a9a" />
      <rect x="2" y="13" width="4" height="5" fill="#1a2040" />
      <rect x="8" y="13" width="4" height="5" fill="#1a2040" />
    </g>
  );
}

function Fielder64({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} opacity="0.7">
      <ellipse cx="6" cy="16" rx="5" ry="1.8" fill="rgba(0,0,0,0.3)" />
      <circle cx="6" cy="3.5" r="3.2" fill="#d4b090" />
      <rect x="2.5" y="6.5" width="7" height="8" rx="1.5" fill="#3a6aaa" />
      <rect x="2" y="14" width="3.5" height="4" rx="0.8" fill="#1a2438" />
      <rect x="6.5" y="14" width="3.5" height="4" rx="0.8" fill="#1a2438" />
    </g>
  );
}
