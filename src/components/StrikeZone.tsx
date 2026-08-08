"use client";

import type { Pitch } from "@/lib/sim";

const RESULT_COLOR: Record<Pitch["result"], string> = {
  ball: "#4a9de0",
  called: "#e0483a",
  swinging: "#f0c040",
  foul: "#9aa0a6",
  inplay: "#f4efe4",
  hbp: "#e8842a",
};

const RESULT_LABEL: Record<Pitch["result"], string> = {
  ball: "Ball",
  called: "Called strike",
  swinging: "Swinging strike",
  foul: "Foul",
  inplay: "In play",
  hbp: "Hit by pitch",
};

const TYPE_LABEL: Record<string, string> = {
  FF: "Four-seam",
  SI: "Sinker",
  SL: "Slider",
  CH: "Change",
  CB: "Curve",
};

/**
 * Broadcast strike-zone plot. `shown` pitches are already thrown; the last one
 * is the live pitch. Coordinates: strike zone within [-1, 1] on each axis.
 */
export function StrikeZone({
  pitches,
  shown,
  balls,
  strikes,
}: {
  pitches: Pitch[];
  shown: number;
  balls: number;
  strikes: number;
}) {
  // SVG geometry
  const size = 200;
  const cx = size / 2;
  const cy = size / 2 - 8;
  const zoneHalf = 46; // px for |coord| = 1
  const px = (x: number) => cx + x * zoneHalf;
  const py = (y: number) => cy - y * zoneHalf;

  const visible = pitches.slice(0, Math.max(0, shown));
  const latest = visible[visible.length - 1];

  return (
    <div className="gc-zone">
      <svg viewBox={`0 0 ${size} ${size}`} className="gc-zone-svg" aria-label="Strike zone">
        <defs>
          <radialGradient id="zoneGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="rgba(120,160,120,0.14)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width={size} height={size} fill="url(#zoneGlow)" />

        {/* Strike zone box + thirds */}
        <rect
          x={px(-1)}
          y={py(1)}
          width={zoneHalf * 2}
          height={zoneHalf * 2}
          className="gc-zone-box"
        />
        {[-1 / 3, 1 / 3].map((t) => (
          <line
            key={`v${t}`}
            x1={px(t)}
            y1={py(1)}
            x2={px(t)}
            y2={py(-1)}
            className="gc-zone-grid"
          />
        ))}
        {[-1 / 3, 1 / 3].map((t) => (
          <line
            key={`h${t}`}
            x1={px(-1)}
            y1={py(t)}
            x2={px(1)}
            y2={py(t)}
            className="gc-zone-grid"
          />
        ))}

        {/* Home plate */}
        <polygon
          points={`${px(-0.62)},${py(-1.5)} ${px(0.62)},${py(-1.5)} ${px(0.62)},${py(-1.72)} ${px(0)},${py(-1.9)} ${px(-0.62)},${py(-1.72)}`}
          className="gc-zone-plate"
        />

        {/* Pitches */}
        {visible.map((p, i) => {
          const isLast = i === visible.length - 1;
          const r = isLast ? 8 : 5.5;
          return (
            <g key={i}>
              <circle
                cx={px(p.x)}
                cy={py(p.y)}
                r={r}
                fill={RESULT_COLOR[p.result]}
                stroke={isLast ? "#fff" : "rgba(0,0,0,0.5)"}
                strokeWidth={isLast ? 2 : 1}
                opacity={isLast ? 1 : 0.6}
              />
              <text
                x={px(p.x)}
                y={py(p.y) + 3}
                textAnchor="middle"
                className="gc-zone-num"
                fontSize={isLast ? 9 : 7}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="gc-zone-info">
        <div className="gc-count">
          <span className="gc-count-b">
            <b>{balls}</b>-<b>{strikes}</b>
          </span>
          <span className="gc-count-dots" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <i key={`b${i}`} className={i < balls ? "on ball" : ""} />
            ))}
            {" "}
            {[0, 1].map((i) => (
              <i key={`s${i}`} className={i < strikes ? "on strike" : ""} />
            ))}
          </span>
        </div>
        {latest ? (
          <div className="gc-pitch-meta">
            <span className="gc-pitch-type">
              {TYPE_LABEL[latest.type] ?? latest.type}
            </span>
            <span className="gc-pitch-velo stat-mono">{latest.velo} mph</span>
            <span
              className="gc-pitch-result"
              style={{ color: RESULT_COLOR[latest.result] }}
            >
              {RESULT_LABEL[latest.result]}
            </span>
          </div>
        ) : (
          <div className="gc-pitch-meta">
            <span className="gc-pitch-type">Windup…</span>
          </div>
        )}
      </div>
    </div>
  );
}
