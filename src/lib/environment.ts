/**
 * Park + era environment for the PA sim.
 *
 * Career cards keep their rates; these multipliers shape the *game* climate.
 * Default era is "neutral" so mixed-era dynasties aren't double-counted.
 */

export type ParkFactors = {
  code: string;
  name: string;
  /** Overall run environment (1 = average) */
  run: number;
  /** Home-run park factor */
  hr: number;
  /** Ball-in-play / hit factor (BABIP-ish) */
  hit: number;
};

export type EraEnv = {
  id: string;
  label: string;
  k: number;
  bb: number;
  hr: number;
  /** Balls in play becoming hits */
  babip: number;
};

/** Approximate modern-ish park factors by franchise city code. */
export const PARK_BY_CODE: Record<string, ParkFactors> = {
  BAL: { code: "BAL", name: "Baltimore Park", run: 1.04, hr: 1.1, hit: 1.02 },
  BOS: { code: "BOS", name: "Boston Park", run: 1.08, hr: 1.06, hit: 1.07 },
  NYAL: { code: "NYAL", name: "New York AL Park", run: 1.05, hr: 1.18, hit: 1.01 },
  TB: { code: "TB", name: "Tampa Bay Park", run: 0.96, hr: 0.95, hit: 0.97 },
  TOR: { code: "TOR", name: "Toronto Park", run: 1.03, hr: 1.12, hit: 1.0 },
  CHAL: { code: "CHAL", name: "Chicago AL Park", run: 0.98, hr: 1.08, hit: 0.97 },
  CLE: { code: "CLE", name: "Cleveland Park", run: 1.0, hr: 1.02, hit: 1.0 },
  DET: { code: "DET", name: "Detroit Park", run: 1.02, hr: 1.05, hit: 1.01 },
  KC: { code: "KC", name: "Kansas City Park", run: 1.01, hr: 0.92, hit: 1.03 },
  MIN: { code: "MIN", name: "Minnesota Park", run: 1.02, hr: 1.04, hit: 1.01 },
  HOU: { code: "HOU", name: "Houston Park", run: 0.97, hr: 1.08, hit: 0.96 },
  LAAL: { code: "LAAL", name: "Los Angeles AL Park", run: 0.96, hr: 0.98, hit: 0.97 },
  OAK: { code: "OAK", name: "Oakland Park", run: 0.94, hr: 0.9, hit: 0.96 },
  SEA: { code: "SEA", name: "Seattle Park", run: 0.93, hr: 0.92, hit: 0.95 },
  TEX: { code: "TEX", name: "Texas Park", run: 1.1, hr: 1.2, hit: 1.04 },
  ATL: { code: "ATL", name: "Atlanta Park", run: 1.02, hr: 1.08, hit: 1.0 },
  MIA: { code: "MIA", name: "Miami Park", run: 0.95, hr: 0.88, hit: 0.97 },
  NYNL: { code: "NYNL", name: "New York NL Park", run: 0.97, hr: 1.05, hit: 0.96 },
  PHI: { code: "PHI", name: "Philadelphia Park", run: 1.04, hr: 1.14, hit: 1.01 },
  WSH: { code: "WSH", name: "Washington Park", run: 1.01, hr: 1.06, hit: 1.0 },
  CHNL: { code: "CHNL", name: "Chicago NL Park", run: 1.06, hr: 1.12, hit: 1.03 },
  CIN: { code: "CIN", name: "Cincinnati Park", run: 1.08, hr: 1.22, hit: 1.02 },
  MIL: { code: "MIL", name: "Milwaukee Park", run: 1.03, hr: 1.1, hit: 1.01 },
  PIT: { code: "PIT", name: "Pittsburgh Park", run: 0.97, hr: 0.9, hit: 0.99 },
  STL: { code: "STL", name: "St. Louis Park", run: 0.98, hr: 0.94, hit: 0.99 },
  ARI: { code: "ARI", name: "Arizona Park", run: 1.07, hr: 1.16, hit: 1.04 },
  COL: { code: "COL", name: "Colorado Park", run: 1.32, hr: 1.38, hit: 1.18 },
  LANL: { code: "LANL", name: "Los Angeles NL Park", run: 0.94, hr: 1.02, hit: 0.94 },
  SD: { code: "SD", name: "San Diego Park", run: 0.9, hr: 0.82, hit: 0.93 },
  SF: { code: "SF", name: "San Francisco Park", run: 0.89, hr: 0.78, hit: 0.94 },
};

export const NEUTRAL_PARK: ParkFactors = {
  code: "GEN",
  name: "Neutral Park",
  run: 1,
  hr: 1,
  hit: 1,
};

export function parkForCode(code?: string | null): ParkFactors {
  if (!code) return NEUTRAL_PARK;
  return PARK_BY_CODE[code.trim().toUpperCase()] ?? NEUTRAL_PARK;
}

export const ERAS: Record<string, EraEnv> = {
  neutral: {
    id: "neutral",
    label: "Neutral (career rates)",
    k: 1,
    bb: 1,
    hr: 1,
    babip: 1,
  },
  deadball: {
    id: "deadball",
    label: "Dead ball",
    k: 0.55,
    bb: 0.85,
    hr: 0.4,
    babip: 1.08,
  },
  liveball: {
    id: "liveball",
    label: "Live ball",
    k: 0.72,
    bb: 0.95,
    hr: 0.85,
    babip: 1.04,
  },
  expansion: {
    id: "expansion",
    label: "Expansion era",
    k: 0.95,
    bb: 1.02,
    hr: 1.0,
    babip: 1.0,
  },
  steroid: {
    id: "steroid",
    label: "High-offense era",
    k: 1.05,
    bb: 1.05,
    hr: 1.28,
    babip: 1.02,
  },
  modern: {
    id: "modern",
    label: "Modern K era",
    k: 1.22,
    bb: 1.04,
    hr: 1.12,
    babip: 0.96,
  },
};

export function eraById(id?: string | null): EraEnv {
  if (!id) return ERAS.neutral;
  return ERAS[id] ?? ERAS.neutral;
}

/**
 * Dynasty era locks — pick at league creation.
 * Filters the draft pool so Hunter Greene isn't whiffing Babe Ruth
 * unless you explicitly choose All-time chaos.
 */
export type DynastyEra = {
  id: string;
  label: string;
  blurb: string;
  yearFrom: number;
  yearTo: number;
  /** Minimum overlapping seasons to be draftable */
  minOverlap: number;
  /** Sim climate id — usually neutral once the pool is era-native */
  climateId: string;
};

export const DYNASTY_ERAS: DynastyEra[] = [
  {
    id: "pre1950",
    label: "Pre-1950",
    blurb: "Dead ball through WWII — Ruth, Gehrig, Hornsby, Grove",
    yearFrom: 1871,
    yearTo: 1949,
    minOverlap: 3,
    climateId: "neutral",
  },
  {
    id: "classic",
    label: "1950–1979",
    blurb: "Integration through the 70s — Mays, Aaron, Koufax, Seaver",
    yearFrom: 1950,
    yearTo: 1979,
    minOverlap: 3,
    climateId: "neutral",
  },
  {
    id: "freeagent",
    label: "1980–1999",
    blurb: "Free agency & power boom — Rickey, Bonds peak start, Maddux",
    yearFrom: 1980,
    yearTo: 1999,
    minOverlap: 3,
    climateId: "neutral",
  },
  {
    id: "modern",
    label: "2000–now",
    blurb: "Moneyball through the K era — Pujols, Trout, Verlander, Greene",
    yearFrom: 2000,
    yearTo: 2025,
    minOverlap: 3,
    climateId: "neutral",
  },
  {
    id: "open",
    label: "All-time (chaos)",
    blurb: "Every career card. Yes, Greene can K Ruth. You asked for it.",
    yearFrom: 1871,
    yearTo: 2025,
    minOverlap: 1,
    climateId: "neutral",
  },
];

export const DYNASTY_ERA_BY_ID = Object.fromEntries(
  DYNASTY_ERAS.map((e) => [e.id, e]),
) as Record<string, DynastyEra>;

export function dynastyEraById(id?: string | null): DynastyEra {
  if (!id) return DYNASTY_ERA_BY_ID.modern;
  return DYNASTY_ERA_BY_ID[id] ?? DYNASTY_ERA_BY_ID.modern;
}

/** Seasons of career overlapping the dynasty window. */
export function eraOverlapYears(
  yearFrom: number,
  yearTo: number,
  era: Pick<DynastyEra, "yearFrom" | "yearTo">,
): number {
  const start = Math.max(yearFrom, era.yearFrom);
  const end = Math.min(yearTo, era.yearTo);
  return Math.max(0, end - start + 1);
}

export function playerInDynastyEra(
  yearFrom: number,
  yearTo: number,
  era: DynastyEra,
): boolean {
  return eraOverlapYears(yearFrom, yearTo, era) >= era.minOverlap;
}

/**
 * Prisma where clause approximating min overlap without raw SQL:
 * yearFrom <= eraTo-(min-1) AND yearTo >= eraFrom+(min-1)
 */
export function dynastyEraPlayerWhere(era: DynastyEra) {
  const pad = Math.max(0, era.minOverlap - 1);
  return {
    yearFrom: { lte: era.yearTo - pad },
    yearTo: { gte: era.yearFrom + pad },
  };
}
