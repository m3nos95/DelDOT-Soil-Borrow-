import type { NofoCriteria } from "./types";
import {
  SAMPLE_BRIDGE_NOFO,
  SAMPLE_BUS_NOFO,
  SAMPLE_PROTECT_NOFO,
  SAMPLE_RAISE_NOFO,
  SAMPLE_SS4A_NOFO,
} from "./sample-nofo";

export type ProgramCatalog = {
  code: string;
  names: string[];
  criteria: Omit<NofoCriteria, "source" | "summary"> & { summary: string };
};

export const PROGRAM_CATALOG: ProgramCatalog[] = [
  {
    code: "SS4A",
    names: [
      "safe streets and roads for all",
      "ss4a",
      "safe streets",
      "roadway fatalities",
      "vulnerable road user",
    ],
    criteria: {
      programName: "Safe Streets and Roads for All (SS4A)",
      programCode: "SS4A",
      agency: "U.S. DOT / FHWA",
      fiscalYear: "FY2024",
      summary:
        "Discretionary grants to prevent roadway deaths and serious injuries through implementation and safety planning.",
      eligibility: [
        "State, MPO, or local government applicant",
        "Consistent with a qualifying Action Plan for implementation grants",
        "Infrastructure or behavioral safety activities, or supplemental planning",
        "Projects addressing high-injury networks or vulnerable road users",
      ],
      evaluationCriteria: [
        "Safety impact: expected reduction in fatalities and serious injuries",
        "Equity and benefits to underserved communities",
        "Proven countermeasures and Safe System approach",
        "Community engagement",
        "Project readiness and schedule",
        "Data-driven analysis using crash history",
      ],
      programPriorities: [
        "Prevent roadway deaths",
        "Support data-driven safety planning",
        "Equity and community impact",
        "Protect vulnerable road users",
        "Complete Streets and Safe System principles",
      ],
      fundingObjectives: [
        "Implementation of infrastructure and behavioral safety projects",
        "Supplemental planning that leads to implementation",
        "Construction-ready projects within the period of performance",
      ],
      eligibleProjectTypes: [
        "intersection safety",
        "pedestrian and bicycle",
        "lighting and crossings",
        "speed management",
        "complete streets",
        "road diets",
        "systemic safety",
        "safety action plans",
      ],
      keywords: [
        "safety",
        "fatality",
        "serious injury",
        "pedestrian",
        "bicycle",
        "vru",
        "intersection",
        "signal",
        "complete streets",
        "high-crash",
        "equity",
        "lighting",
        "crossing",
        "speed",
        "action plan",
        "data-driven",
      ],
      awardRange: { min: 1_000_000, max: 25_000_000 },
    },
  },
  {
    code: "RAISE",
    names: ["raise", "rebuild american infrastructure", "tigers", "build grant"],
    criteria: {
      programName: "Rebuilding American Infrastructure with Sustainability and Equity (RAISE)",
      programCode: "RAISE",
      agency: "U.S. DOT",
      fiscalYear: "FY2024",
      summary:
        "Multimodal capital and planning grants for projects with significant local or regional impact.",
      eligibility: [
        "State, tribal, MPO, or local applicant",
        "Highway, bridge, transit, rail, port, or multimodal surface project",
      ],
      evaluationCriteria: [
        "Safety",
        "Environmental sustainability",
        "Quality of life",
        "Mobility and community connectivity",
        "Economic competitiveness",
        "State of good repair",
        "Partnership",
        "Innovation",
      ],
      programPriorities: [
        "Equity and Justice40 communities",
        "Rural projects",
        "Climate and resilience",
        "Multimodal complete streets",
      ],
      fundingObjectives: [
        "Capital projects with demonstrated local/regional impact",
        "Planning that leads to capital delivery",
      ],
      eligibleProjectTypes: [
        "complete streets",
        "transit",
        "bridge",
        "multimodal",
        "freight",
        "bike-ped",
      ],
      keywords: [
        "multimodal",
        "equity",
        "complete streets",
        "transit",
        "connectivity",
        "economic",
        "rural",
        "quality of life",
      ],
      awardRange: { min: 1_000_000, max: 25_000_000 },
    },
  },
  {
    code: "BRIDGE",
    names: ["bridge investment program", "bip", "bridge formula", "structurally deficient"],
    criteria: {
      programName: "Bridge Investment Program (BIP)",
      programCode: "BRIDGE",
      agency: "U.S. DOT / FHWA",
      fiscalYear: "FY2024",
      summary: "Competitive grants to replace, rehabilitate, preserve, or protect bridges.",
      eligibility: [
        "State DOT or Federal land management agency",
        "Bridges in poor condition, load posted, or structurally deficient",
      ],
      evaluationCriteria: [
        "Bridge condition and load posting",
        "Mobility and freight benefits",
        "Project readiness",
        "Cost effectiveness of bundling",
        "Safety and scour/seismic risk",
      ],
      programPriorities: [
        "Reduce bridges in poor condition",
        "Restore load-posted bridges",
        "Bundle rural bridges",
        "Improve freight reliability",
      ],
      fundingObjectives: ["Replacement, rehabilitation, preservation, and protection of bridges"],
      eligibleProjectTypes: ["bridge rehabilitation", "bridge replacement", "scour", "bundling"],
      keywords: [
        "bridge",
        "structurally-deficient",
        "load-posting",
        "scour",
        "deck",
        "rural",
        "freight",
      ],
      awardRange: { min: 2_500_000, max: 100_000_000 },
    },
  },
  {
    code: "PROTECT",
    names: ["protect", "resilient operations", "resilience discretionary", "climate resilience"],
    criteria: {
      programName: "PROTECT Discretionary Program",
      programCode: "PROTECT",
      agency: "U.S. DOT / FHWA",
      fiscalYear: "FY2024",
      summary: "Grants that improve surface transportation resilience to natural hazards.",
      eligibility: [
        "State, MPO, or local government",
        "Resilience improvements, evacuation routes, or resilience planning",
      ],
      evaluationCriteria: [
        "Resilience benefit and risk reduction",
        "Protection of critical and evacuation routes",
        "Equity",
        "Cost effectiveness",
        "Readiness",
      ],
      programPriorities: [
        "Coastal and flood resilience",
        "Evacuation route reliability",
        "Nature-based solutions",
        "NHS continuity",
      ],
      fundingObjectives: ["Construction of resilience improvements and resilience planning"],
      eligibleProjectTypes: ["flood mitigation", "coastal protection", "evacuation", "drainage"],
      keywords: ["resilience", "flood", "sea-level", "evacuation", "coastal", "storm", "climate"],
      awardRange: { min: 1_000_000, max: 50_000_000 },
    },
  },
  {
    code: "INFRA",
    names: [
      "infra grants",
      "infra program",
      "infra (nationally",
      "nationally significant multimodal",
      "nationally significant freight",
      "nsmfhp",
    ],
    criteria: {
      programName: "INFRA (Nationally Significant Multimodal Freight & Highway Projects)",
      programCode: "INFRA",
      agency: "U.S. DOT",
      fiscalYear: "FY2024",
      summary: "Large freight and highway projects of national or regional significance.",
      eligibility: ["State or group of States", "Highway freight, freight rail, port, or intermodal"],
      evaluationCriteria: [
        "Economic outcomes and freight reliability",
        "Safety",
        "State of good repair",
        "Project readiness",
      ],
      programPriorities: ["Freight bottlenecks", "Interstate reliability", "Supply chain"],
      fundingObjectives: ["Nationally significant freight and highway construction"],
      eligibleProjectTypes: ["freight", "interstate", "interchange", "bottleneck"],
      keywords: ["freight", "interstate", "bottleneck", "reliability", "supply chain", "nhs"],
      awardRange: { min: 25_000_000, max: 500_000_000 },
    },
  },
  {
    code: "CFI",
    names: ["charging and fueling", "cfi", "alternative fuel corridor", "ev charging"],
    criteria: {
      programName: "Charging and Fueling Infrastructure (CFI) Program",
      programCode: "CFI",
      agency: "U.S. DOT / FHWA",
      fiscalYear: "FY2024",
      summary: "Public EV charging and alternative fueling infrastructure.",
      eligibility: ["State, local, or tribal government", "Publicly accessible charging/fueling"],
      evaluationCriteria: ["Corridor coverage", "Community charging equity", "Readiness", "Operations"],
      programPriorities: ["Corridor gaps", "Rural coverage", "Disadvantaged community access"],
      fundingObjectives: ["Deploy publicly accessible charging and fueling"],
      eligibleProjectTypes: ["ev charging", "alternative fuel", "community hubs"],
      keywords: ["ev", "charging", "alternative-fuel", "corridor", "hydrogen"],
      awardRange: { min: 500_000, max: 15_000_000 },
    },
  },
  {
    code: "BUS",
    names: [
      "grants for buses and bus facilities",
      "bus facilities infrastructure",
      "low or no emission",
      "low-no",
      "low no emission",
      "fta-2026-010",
      "fta-2026-011",
      "5339(b)",
      "5339(c)",
      "buses and bus facilities",
    ],
    criteria: {
      programName: "FTA Grants for Buses and Bus Facilities / Low or No Emission (FY2026)",
      programCode: "BUS",
      agency: "U.S. DOT / FTA",
      fiscalYear: "FY2026",
      summary:
        "Competitive FTA grants for buses, bus facilities, and low- or no-emission transit vehicles and related charging or fueling.",
      eligibility: [
        "Designated FTA recipients, states, and eligible transit agencies",
        "Projects to replace, rehabilitate, purchase, or lease buses or related equipment",
        "Bus facilities, including maintenance, administrative, and passenger facilities",
        "Low or no emission buses and related charging, fueling, and facility work",
      ],
      evaluationCriteria: [
        "Demonstration of need",
        "Demonstration of benefits, including safety and emissions reduction",
        "Project implementation strategy and readiness",
        "Local financial commitment",
      ],
      programPriorities: [
        "Zero-emission and low-emission transit buses",
        "Bus facilities in a state of good repair",
        "Workforce development for zero-emission fleets",
        "Improved transit service reliability",
      ],
      fundingObjectives: [
        "Purchase or lease of buses and related equipment",
        "Construction or rehabilitation of bus facilities",
        "Low or no emission vehicle and infrastructure deployment",
      ],
      eligibleProjectTypes: [
        "transit buses",
        "bus facilities",
        "bus maintenance facilities",
        "low-no emission buses",
        "transit charging",
      ],
      keywords: [
        "transit",
        "bus",
        "dart",
        "low-no",
        "zero-emission",
        "charging",
        "fleet",
        "facility",
        "5339",
      ],
      awardRange: { min: 500_000, max: 50_000_000 },
    },
  },
];

const SECTION_PATTERNS: Array<{ key: keyof Pick<NofoCriteria, "eligibility" | "evaluationCriteria" | "programPriorities" | "fundingObjectives">; labels: RegExp }> = [
  { key: "eligibility", labels: /eligibility|eligible (applicant|activit|project)/i },
  { key: "evaluationCriteria", labels: /evaluation criteria|merit criteria|selection criteria/i },
  { key: "programPriorities", labels: /program priorit|department priorit|usdott priorit/i },
  { key: "fundingObjectives", labels: /funding object|award information|available funding|period of performance/i },
];

export function detectProgram(text: string): ProgramCatalog | undefined {
  const hay = text.toLowerCase();
  let best: { program: ProgramCatalog; score: number } | undefined;
  for (const program of PROGRAM_CATALOG) {
    let score = 0;
    for (const name of program.names) {
      score += phraseScore(hay, name);
    }
    if (score > 0 && (!best || score > best.score)) best = { program, score };
  }
  return best?.program;
}

function phraseScore(hay: string, name: string): number {
  const needle = name.toLowerCase();
  if (!needle) return 0;
  if (needle.includes(" ") || needle.includes("-") || needle.includes("(")) {
    return hay.includes(needle) ? needle.length : 0;
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(hay) ? needle.length : 0;
}

function bulletsFrom(block: string): string[] {
  const lines = block
    .split(/\n+/)
    .map((l) => l.replace(/^[\s>*•\-–\d.)]+/, "").trim())
    .filter((l) => l.length > 20 && l.length < 240);
  const unique = [...new Set(lines)];
  return unique.slice(0, 8);
}

function extractSections(text: string): Partial<NofoCriteria> {
  const parts = text.split(/\n(?=\s*\d+\.\s|[A-Z][A-Z ]{8,}\n)/);
  const found: Partial<NofoCriteria> = {};
  for (const part of parts) {
    const head = part.slice(0, 80);
    for (const { key, labels } of SECTION_PATTERNS) {
      if (labels.test(head) && !found[key]) {
        found[key] = bulletsFrom(part);
      }
    }
  }
  return found;
}

function mergeUnique(primary: string[] | undefined, fallback: string[]): string[] {
  const out: string[] = [];
  for (const item of [...(primary ?? []), ...fallback]) {
    const key = item.toLowerCase();
    if (!out.some((x) => x.toLowerCase() === key)) out.push(item);
  }
  return out.slice(0, 8);
}

export function extractNofoCriteria(text: string, fileName = "uploaded-nofo"): NofoCriteria {
  const catalog = detectProgram(text);
  const extracted = extractSections(text);
  const fy = text.match(/FY\s?20\d{2}|Fiscal Year\s+20\d{2}/i)?.[0] ?? catalog?.criteria.fiscalYear ?? "FY2024";

  if (catalog) {
    const base = catalog.criteria;
    return {
      ...base,
      fiscalYear: /20\d{2}/.exec(fy)?.[0] ? fy.replace(/Fiscal Year/i, "FY") : base.fiscalYear,
      eligibility: mergeUnique(extracted.eligibility, base.eligibility),
      evaluationCriteria: mergeUnique(extracted.evaluationCriteria, base.evaluationCriteria),
      programPriorities: mergeUnique(extracted.programPriorities, base.programPriorities),
      fundingObjectives: mergeUnique(extracted.fundingObjectives, base.fundingObjectives),
      source: extracted.eligibility?.length || extracted.evaluationCriteria?.length ? "hybrid" : "catalog",
    };
  }

  const keywords = harvestKeywords(text);
  return {
    programName: guessTitle(text, fileName),
    programCode: "CUSTOM",
    agency: /u\.?s\.?\s*dot|fhwa|fta|fra/i.test(text) ? "U.S. DOT" : "Federal agency",
    fiscalYear: fy,
    summary: "Criteria extracted from the uploaded NOFO. Grant Manager should validate extracted requirements.",
    eligibility: extracted.eligibility?.length ? extracted.eligibility : ["Review eligibility in the source NOFO."],
    evaluationCriteria: extracted.evaluationCriteria?.length
      ? extracted.evaluationCriteria
      : ["Review evaluation criteria in the source NOFO."],
    programPriorities: extracted.programPriorities?.length
      ? extracted.programPriorities
      : keywords.slice(0, 5),
    fundingObjectives: extracted.fundingObjectives?.length
      ? extracted.fundingObjectives
      : ["Align projects to stated funding objectives in the NOFO."],
    eligibleProjectTypes: keywords.slice(0, 6),
    keywords,
    source: "extracted",
  };
}

function guessTitle(text: string, fileName: string): string {
  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 12 && l.length < 140 && /grant|program|nofo|opportunity/i.test(l));
  if (line) return line.replace(/\s+/g, " ");
  return fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ");
}

function harvestKeywords(text: string): string[] {
  const vocab = [
    "safety",
    "equity",
    "pedestrian",
    "bicycle",
    "transit",
    "bridge",
    "freight",
    "resilience",
    "flood",
    "evacuation",
    "complete streets",
    "rural",
    "charging",
    "pavement",
    "intersection",
    "signal",
    "climate",
    "multimodal",
    "bus",
    "fleet",
  ];
  const hay = text.toLowerCase();
  return vocab.filter((k) => hay.includes(k));
}

export function sampleNofoTextForFile(fileName: string): string | undefined {
  const n = fileName.toLowerCase();
  if (n.includes("ss4a") || n.includes("safe streets")) return SAMPLE_SS4A_NOFO;
  if (n.includes("raise")) return SAMPLE_RAISE_NOFO;
  if (n.includes("bridge") || n.includes("bip")) return SAMPLE_BRIDGE_NOFO;
  if (n.includes("protect")) return SAMPLE_PROTECT_NOFO;
  if (n.includes("bus") || n.includes("low-no") || n.includes("low no")) return SAMPLE_BUS_NOFO;
  return undefined;
}
