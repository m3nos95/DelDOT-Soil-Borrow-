/** Full-bleed cinematic night diamond — landing / auth atmosphere. */
export function HeroField() {
  return (
    <svg
      className="hero-drift absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="hfSky" cx="50%" cy="12%" r="90%">
          <stop offset="0%" stopColor="#1a3d2e" />
          <stop offset="28%" stopColor="#0c2218" />
          <stop offset="62%" stopColor="#071410" />
          <stop offset="100%" stopColor="#020504" />
        </radialGradient>
        <radialGradient id="hfFlood" cx="50%" cy="78%" r="52%">
          <stop offset="0%" stopColor="rgba(255,220,120,0.28)" />
          <stop offset="35%" stopColor="rgba(232,184,74,0.12)" />
          <stop offset="70%" stopColor="rgba(22,60,40,0.25)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="hfGrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a6b44" />
          <stop offset="40%" stopColor="#1a4a30" />
          <stop offset="100%" stopColor="#0a2418" />
        </linearGradient>
        <linearGradient id="hfGrassDeep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#163c28" />
          <stop offset="50%" stopColor="#1f5236" />
          <stop offset="100%" stopColor="#123024" />
        </linearGradient>
        <linearGradient id="hfBeamL" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%" stopColor="rgba(255,230,150,0.38)" />
          <stop offset="45%" stopColor="rgba(232,184,74,0.1)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="hfBeamR" x1="1" y1="0" x2="0.45" y2="1">
          <stop offset="0%" stopColor="rgba(255,230,150,0.38)" />
          <stop offset="45%" stopColor="rgba(232,184,74,0.1)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="hfDirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c49a58" />
          <stop offset="55%" stopColor="#8a6232" />
          <stop offset="100%" stopColor="#6a4a24" />
        </linearGradient>
        <radialGradient id="hfMound" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#a87840" />
          <stop offset="100%" stopColor="#5a3c1c" />
        </radialGradient>
        <pattern id="hfMow" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="transparent" />
          <rect width="24" height="48" fill="rgba(0,0,0,0.1)" />
        </pattern>
        <pattern id="hfGrain" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.4" fill="rgba(255,255,255,0.03)" />
        </pattern>
        <filter id="hfSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="hfWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2818" />
          <stop offset="100%" stopColor="#1a120c" />
        </linearGradient>
      </defs>

      {/* Night sky */}
      <rect width="1600" height="900" fill="url(#hfSky)" />

      {/* Stars */}
      <g className="hero-stars" fill="#f3efe4">
        <circle cx="180" cy="70" r="1.1" opacity="0.55" />
        <circle cx="320" cy="110" r="0.8" opacity="0.4" />
        <circle cx="460" cy="55" r="1.2" opacity="0.65" />
        <circle cx="610" cy="90" r="0.7" opacity="0.35" />
        <circle cx="780" cy="48" r="1" opacity="0.5" />
        <circle cx="920" cy="85" r="0.9" opacity="0.45" />
        <circle cx="1080" cy="60" r="1.3" opacity="0.7" />
        <circle cx="1220" cy="100" r="0.8" opacity="0.4" />
        <circle cx="1380" cy="72" r="1.1" opacity="0.55" />
        <circle cx="250" cy="150" r="0.6" opacity="0.3" />
        <circle cx="1450" cy="140" r="0.7" opacity="0.35" />
        <circle cx="700" cy="130" r="0.5" opacity="0.28" />
      </g>

      {/* Floodlight beams */}
      <g className="flood-beams">
        <polygon points="243,88 80,900 420,900" fill="url(#hfBeamL)" opacity="0.9" />
        <polygon points="280,88 200,900 360,900" fill="url(#hfBeamL)" opacity="0.45" />
        <polygon points="1357,88 1180,900 1520,900" fill="url(#hfBeamR)" opacity="0.9" />
        <polygon points="1320,88 1240,900 1400,900" fill="url(#hfBeamR)" opacity="0.45" />
        <polygon points="800,60 620,900 980,900" fill="rgba(255,220,140,0.04)" />
      </g>

      <ellipse cx="800" cy="840" rx="980" ry="320" fill="url(#hfFlood)" />

      {/* Distant stands / crowd silhouette */}
      <path
        d="M0 520 Q200 470 400 490 Q600 455 800 480 Q1000 455 1200 490 Q1400 470 1600 520 L1600 900 L0 900 Z"
        fill="#040a08"
        opacity="0.55"
      />
      <path
        d="M0 560 Q300 510 550 535 Q800 500 1050 535 Q1300 510 1600 560"
        fill="none"
        stroke="rgba(243,239,228,0.06)"
        strokeWidth="2"
      />

      {/* Outfield grass plane */}
      <path d="M40 920 Q800 70 1560 920" fill="url(#hfGrass)" />
      <path d="M40 920 Q800 70 1560 920" fill="url(#hfGrassDeep)" opacity="0.35" />
      <path d="M40 920 Q800 70 1560 920" fill="url(#hfMow)" opacity="0.65" />

      {/* Warning track */}
      <path
        d="M120 920 Q800 130 1480 920"
        fill="none"
        stroke="#9a6a38"
        strokeWidth="10"
        opacity="0.55"
      />
      <path
        d="M130 920 Q800 145 1470 920"
        fill="none"
        stroke="rgba(243,239,228,0.12)"
        strokeWidth="2"
      />

      {/* Outfield wall arc */}
      <path
        d="M100 920 Q800 100 1500 920"
        fill="none"
        stroke="url(#hfWall)"
        strokeWidth="14"
        opacity="0.85"
      />

      {/* Foul territory hint */}
      <path
        d="M220 920 Q800 210 1380 920"
        fill="none"
        stroke="rgba(243,239,228,0.08)"
        strokeWidth="1.5"
      />

      {/* Infield dirt skin */}
      <polygon
        points="800,355 1080,630 800,805 520,630"
        fill="url(#hfDirt)"
        opacity="0.95"
      />
      <polygon
        points="800,410 1005,630 800,760 595,630"
        fill="#d4a868"
        opacity="0.22"
      />
      {/* Cutout grass lips */}
      <ellipse cx="800" cy="630" rx="210" ry="155" fill="none" stroke="rgba(20,50,30,0.35)" strokeWidth="18" />

      {/* Baseline chalk */}
      <g filter="url(#hfSoftGlow)" opacity="0.95">
        <line
          x1="800"
          y1="805"
          x2="120"
          y2="160"
          stroke="rgba(243,239,228,0.75)"
          strokeWidth="3.5"
        />
        <line
          x1="800"
          y1="805"
          x2="1480"
          y2="160"
          stroke="rgba(243,239,228,0.75)"
          strokeWidth="3.5"
        />
      </g>

      {/* Bases */}
      <g fill="#f7f2e6" stroke="rgba(255,255,255,0.35)" strokeWidth="1">
        <polygon points="1080,630 1100,610 1120,630 1100,650" />
        <polygon points="800,355 820,335 840,355 820,375" />
        <polygon points="520,630 500,610 480,630 500,650" />
        <polygon points="800,828 826,800 826,776 774,776 774,800" />
      </g>

      {/* Mound */}
      <ellipse cx="800" cy="630" rx="48" ry="28" fill="url(#hfMound)" />
      <ellipse cx="800" cy="626" rx="14" ry="8" fill="#f3efe4" opacity="0.8" />
      <ellipse cx="800" cy="624" rx="22" ry="5" fill="rgba(0,0,0,0.15)" />

      {/* Light towers */}
      <g className="hero-towers">
        <g transform="translate(0,0)">
          <rect x="236" y="40" width="8" height="170" fill="rgba(220,210,180,0.22)" />
          <rect x="200" y="40" width="80" height="18" rx="1" fill="rgba(40,36,24,0.9)" />
          <g filter="url(#hfSoftGlow)">
            <rect x="208" y="46" width="14" height="10" fill="#fff3b0" opacity="0.95" />
            <rect x="228" y="46" width="14" height="10" fill="#ffe566" opacity="1" />
            <rect x="248" y="46" width="14" height="10" fill="#fff3b0" opacity="0.95" />
            <rect x="268" y="46" width="8" height="10" fill="#ffe566" opacity="0.85" />
          </g>
        </g>
        <g transform="translate(1110,0)">
          <rect x="236" y="40" width="8" height="170" fill="rgba(220,210,180,0.22)" />
          <rect x="200" y="40" width="80" height="18" rx="1" fill="rgba(40,36,24,0.9)" />
          <g filter="url(#hfSoftGlow)">
            <rect x="208" y="46" width="14" height="10" fill="#fff3b0" opacity="0.95" />
            <rect x="228" y="46" width="14" height="10" fill="#ffe566" opacity="1" />
            <rect x="248" y="46" width="14" height="10" fill="#fff3b0" opacity="0.95" />
            <rect x="268" y="46" width="8" height="10" fill="#ffe566" opacity="0.85" />
          </g>
        </g>
      </g>

      {/* Atmosphere grain + motes */}
      <rect width="1600" height="900" fill="url(#hfGrain)" opacity="0.9" />
      <g className="chalk-motes" fill="rgba(255,245,210,0.45)">
        <circle cx="420" cy="240" r="1.6" />
        <circle cx="510" cy="180" r="1.1" />
        <circle cx="980" cy="210" r="1.5" />
        <circle cx="1120" cy="160" r="1" />
        <circle cx="700" cy="120" r="1.3" />
        <circle cx="860" cy="280" r="1" />
        <circle cx="300" cy="360" r="1.4" />
        <circle cx="1280" cy="340" r="1.2" />
        <circle cx="640" cy="400" r="0.9" />
        <circle cx="1000" cy="380" r="1.1" />
      </g>

      {/* Vignette */}
      <rect
        width="1600"
        height="900"
        fill="url(#hfSky)"
        opacity="0.15"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
