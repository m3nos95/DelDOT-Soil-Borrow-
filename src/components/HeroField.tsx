/** Full-bleed night diamond — atmospheric visual for the landing hero. */
export function HeroField() {
  return (
    <svg
      className="hero-drift absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="nightSky" cx="50%" cy="18%" r="85%">
          <stop offset="0%" stopColor="#204836" />
          <stop offset="35%" stopColor="#0e241a" />
          <stop offset="100%" stopColor="#030706" />
        </radialGradient>
        <radialGradient id="flood" cx="50%" cy="72%" r="48%">
          <stop offset="0%" stopColor="rgba(232,184,74,0.22)" />
          <stop offset="40%" stopColor="rgba(22,60,40,0.4)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="grassTone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#24583a" />
          <stop offset="55%" stopColor="#163c28" />
          <stop offset="100%" stopColor="#0c2418" />
        </linearGradient>
        <linearGradient id="beamL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(232,184,74,0.22)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="beamR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(232,184,74,0.22)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <pattern id="grassStripe" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="transparent" />
          <rect width="20" height="40" fill="rgba(0,0,0,0.08)" />
        </pattern>
      </defs>

      <rect width="1600" height="900" fill="url(#nightSky)" />

      {/* Floodlight beams */}
      <g className="flood-beams" opacity="0.85">
        <polygon points="243,90 120,900 380,900" fill="url(#beamL)" />
        <polygon points="1357,90 1220,900 1480,900" fill="url(#beamR)" />
      </g>

      <ellipse cx="800" cy="820" rx="920" ry="300" fill="url(#flood)" />

      {/* Outfield */}
      <path
        d="M80 900 Q800 90 1520 900"
        fill="url(#grassTone)"
        opacity="0.97"
      />
      <path
        d="M80 900 Q800 90 1520 900"
        fill="url(#grassStripe)"
        opacity="0.55"
      />
      <path
        d="M200 900 Q800 200 1400 900"
        fill="none"
        stroke="rgba(243,239,228,0.1)"
        strokeWidth="2"
      />

      {/* Warning track hint */}
      <path
        d="M160 900 Q800 150 1440 900"
        fill="none"
        stroke="rgba(184,90,40,0.35)"
        strokeWidth="6"
      />

      {/* Infield dirt */}
      <polygon
        points="800,370 1060,620 800,790 540,620"
        fill="#8a6232"
        opacity="0.9"
      />
      <polygon
        points="800,420 990,620 800,750 610,620"
        fill="#b88444"
        opacity="0.5"
      />

      {/* Foul lines */}
      <line
        x1="800"
        y1="790"
        x2="150"
        y2="180"
        stroke="rgba(243,239,228,0.65)"
        strokeWidth="3"
      />
      <line
        x1="800"
        y1="790"
        x2="1450"
        y2="180"
        stroke="rgba(243,239,228,0.65)"
        strokeWidth="3"
      />

      {/* Bases */}
      <polygon points="1060,620 1078,602 1096,620 1078,638" fill="#f3efe4" />
      <polygon points="800,370 818,352 836,370 818,388" fill="#f3efe4" />
      <polygon points="540,620 522,602 504,620 522,638" fill="#f3efe4" />
      <polygon
        points="800,810 824,786 824,764 776,764 776,786"
        fill="#f3efe4"
      />

      {/* Mound */}
      <ellipse cx="800" cy="620" rx="40" ry="24" fill="#6e4e28" />
      <ellipse cx="800" cy="618" rx="11" ry="7" fill="#f3efe4" opacity="0.75" />

      {/* Light towers */}
      <g opacity="0.9">
        <rect x="240" y="70" width="6" height="140" fill="rgba(243,239,228,0.18)" />
        <rect x="214" y="70" width="58" height="14" fill="rgba(232,184,74,0.45)" />
        <rect x="220" y="78" width="10" height="8" fill="#fff6c8" opacity="0.7" />
        <rect x="236" y="78" width="10" height="8" fill="#fff6c8" opacity="0.85" />
        <rect x="252" y="78" width="10" height="8" fill="#fff6c8" opacity="0.7" />

        <rect x="1354" y="70" width="6" height="140" fill="rgba(243,239,228,0.18)" />
        <rect x="1328" y="70" width="58" height="14" fill="rgba(232,184,74,0.45)" />
        <rect x="1334" y="78" width="10" height="8" fill="#fff6c8" opacity="0.7" />
        <rect x="1350" y="78" width="10" height="8" fill="#fff6c8" opacity="0.85" />
        <rect x="1366" y="78" width="10" height="8" fill="#fff6c8" opacity="0.7" />
      </g>

      {/* Floating dust / chalk motes */}
      <g className="chalk-motes" fill="rgba(243,239,228,0.35)">
        <circle cx="420" cy="240" r="1.5" />
        <circle cx="510" cy="180" r="1" />
        <circle cx="980" cy="210" r="1.5" />
        <circle cx="1120" cy="160" r="1" />
        <circle cx="700" cy="120" r="1.2" />
        <circle cx="860" cy="280" r="1" />
        <circle cx="300" cy="360" r="1.3" />
        <circle cx="1280" cy="340" r="1.1" />
      </g>
    </svg>
  );
}
