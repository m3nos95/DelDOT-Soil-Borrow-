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
        <radialGradient id="nightSky" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#1a3a2c" />
          <stop offset="45%" stopColor="#0a1812" />
          <stop offset="100%" stopColor="#040806" />
        </radialGradient>
        <radialGradient id="flood" cx="50%" cy="70%" r="45%">
          <stop offset="0%" stopColor="rgba(232,184,74,0.18)" />
          <stop offset="55%" stopColor="rgba(22,60,40,0.35)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="grassTone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f4a32" />
          <stop offset="100%" stopColor="#0f2a1c" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#nightSky)" />
      <ellipse cx="800" cy="820" rx="900" ry="280" fill="url(#flood)" />
      {/* Outfield arc */}
      <path
        d="M120 900 Q800 120 1480 900"
        fill="url(#grassTone)"
        opacity="0.95"
      />
      <path
        d="M220 900 Q800 220 1380 900"
        fill="none"
        stroke="rgba(243,239,228,0.12)"
        strokeWidth="3"
      />
      {/* Infield dirt */}
      <polygon
        points="800,390 1040,620 800,780 560,620"
        fill="#8a6232"
        opacity="0.85"
      />
      <polygon
        points="800,430 980,620 800,740 620,620"
        fill="#a87a3c"
        opacity="0.55"
      />
      {/* Foul lines */}
      <line
        x1="800"
        y1="780"
        x2="180"
        y2="200"
        stroke="rgba(243,239,228,0.55)"
        strokeWidth="3"
      />
      <line
        x1="800"
        y1="780"
        x2="1420"
        y2="200"
        stroke="rgba(243,239,228,0.55)"
        strokeWidth="3"
      />
      {/* Bases */}
      <polygon points="1040,620 1058,602 1076,620 1058,638" fill="#f3efe4" />
      <polygon points="800,390 818,372 836,390 818,408" fill="#f3efe4" />
      <polygon points="560,620 542,602 524,620 542,638" fill="#f3efe4" />
      <polygon
        points="800,800 822,778 822,758 778,758 778,778"
        fill="#f3efe4"
      />
      {/* Mound */}
      <ellipse cx="800" cy="620" rx="36" ry="22" fill="#6e4e28" />
      <ellipse cx="800" cy="618" rx="10" ry="6" fill="#f3efe4" opacity="0.7" />
      {/* Light towers suggestion */}
      <rect x="240" y="80" width="6" height="120" fill="rgba(243,239,228,0.15)" />
      <rect x="220" y="80" width="46" height="10" fill="rgba(232,184,74,0.35)" />
      <rect x="1354" y="80" width="6" height="120" fill="rgba(243,239,228,0.15)" />
      <rect x="1334" y="80" width="46" height="10" fill="rgba(232,184,74,0.35)" />
    </svg>
  );
}
