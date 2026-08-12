import type { Project, ProjectCategory } from "./types";

const COUNTIES = ["New Castle", "Kent", "Sussex"] as const;
const CORRIDORS = [
  "US 13",
  "US 113",
  "US 40",
  "US 202",
  "SR 1",
  "SR 141",
  "SR 52",
  "SR 72",
  "SR 273",
  "SR 896",
  "SR 24",
  "SR 26",
  "SR 404",
  "I-95",
  "I-495",
  "I-295",
  "SR 54",
  "SR 18",
  "SR 8",
  "SR 10",
];

const PLACES: Record<(typeof COUNTIES)[number], string[]> = {
  "New Castle": [
    "Wilmington",
    "Newark",
    "New Castle",
    "Middletown",
    "Bear",
    "Elsmere",
    "Claymont",
    "Pike Creek",
  ],
  Kent: ["Dover", "Smyrna", "Camden", "Harrington", "Milford", "Clayton", "Felton"],
  Sussex: [
    "Georgetown",
    "Lewes",
    "Rehoboth Beach",
    "Seaford",
    "Millsboro",
    "Milton",
    "Laurel",
    "Bridgeville",
  ],
};

type SeedSpec = Omit<Project, "id">;

const FEATURED: SeedSpec[] = [
  {
    unifierId: "UNF-1001",
    name: "US 13 Intersection Safety Improvements",
    description:
      "Systemic safety package at high-crash US 13 intersections including signal upgrades, left-turn protection, lighting, and pedestrian accommodations in New Castle County.",
    county: "New Castle",
    corridor: "US 13",
    category: "safety",
    estimatedCost: 18400000,
    unfundedAmount: 18400000,
    status: "unfunded",
    readiness: "final-design",
    designPercent: 80,
    modes: ["auto", "pedestrian", "transit"],
    yearNeeded: 2026,
    crashHistory: { fatalities5yr: 6, seriousInjuries5yr: 41, highCrashLocation: true },
    equity: { disadvantagedCommunity: true, rural: false, environmentalJustice: true },
    tags: ["intersection", "signal", "pedestrian", "high-crash", "lighting", "safety"],
  },
  {
    unifierId: "UNF-1002",
    name: "Bridge Rehabilitation - Group 3",
    description:
      "Bundled rehabilitation of load-posted and structurally deficient bridges in Kent and Sussex Counties, restoring legal loads and improving freight reliability.",
    county: "Kent",
    corridor: "US 113",
    category: "bridge",
    estimatedCost: 41200000,
    unfundedAmount: 36800000,
    status: "partially-funded",
    readiness: "preliminary-design",
    designPercent: 35,
    modes: ["auto", "freight"],
    yearNeeded: 2027,
    crashHistory: { fatalities5yr: 0, seriousInjuries5yr: 3, highCrashLocation: false },
    equity: { disadvantagedCommunity: false, rural: true, environmentalJustice: false },
    tags: ["bridge", "structurally-deficient", "rural", "freight", "load-posting"],
  },
  {
    unifierId: "UNF-1003",
    name: "Wilmington High-Injury Network Complete Streets",
    description:
      "Complete streets conversion on a high-injury urban corridor with protected bike lanes, bus stop improvements, curb extensions, and leading pedestrian intervals.",
    county: "New Castle",
    corridor: "SR 52",
    category: "complete-streets",
    estimatedCost: 22100000,
    unfundedAmount: 22100000,
    status: "unfunded",
    readiness: "final-design",
    designPercent: 70,
    modes: ["auto", "pedestrian", "bicycle", "transit"],
    yearNeeded: 2026,
    crashHistory: { fatalities5yr: 8, seriousInjuries5yr: 62, highCrashLocation: true },
    equity: { disadvantagedCommunity: true, rural: false, environmentalJustice: true },
    tags: ["complete-streets", "bike-ped", "equity", "vru", "transit", "high-crash"],
  },
  {
    unifierId: "UNF-1004",
    name: "SR 1 Pedestrian Crossing & Lighting — Coastal Towns",
    description:
      "Marked crossings, refuge islands, RRFBs, and continuous lighting at SR 1 crossings serving beach communities and transit stops.",
    county: "Sussex",
    corridor: "SR 1",
    category: "bike-ped",
    estimatedCost: 9600000,
    unfundedAmount: 9600000,
    status: "unfunded",
    readiness: "construction-ready",
    designPercent: 95,
    modes: ["pedestrian", "bicycle", "auto"],
    yearNeeded: 2025,
    crashHistory: { fatalities5yr: 4, seriousInjuries5yr: 19, highCrashLocation: true },
    equity: { disadvantagedCommunity: false, rural: false, environmentalJustice: false },
    tags: ["pedestrian", "lighting", "crossing", "vru", "tourism", "safety"],
  },
  {
    unifierId: "UNF-1005",
    name: "Dover Transit Signal Priority and Queue Jump",
    description:
      "Transit signal priority, queue jumps, and pedestrian safety upgrades on DART routes serving employment and medical destinations in Dover.",
    county: "Kent",
    corridor: "US 13",
    category: "transit",
    estimatedCost: 7400000,
    unfundedAmount: 7400000,
    status: "unfunded",
    readiness: "final-design",
    designPercent: 75,
    modes: ["transit", "pedestrian", "auto"],
    yearNeeded: 2026,
    crashHistory: { fatalities5yr: 2, seriousInjuries5yr: 14, highCrashLocation: false },
    equity: { disadvantagedCommunity: true, rural: false, environmentalJustice: true },
    tags: ["transit", "signal", "equity", "pedestrian", "tsp"],
  },
  {
    unifierId: "UNF-1006",
    name: "I-95 / SR 141 Interchange Safety and Operations",
    description:
      "Ramp realignment, auxiliary lanes, and wrong-way detection to reduce severe crashes and freight delay at a major New Castle interchange.",
    county: "New Castle",
    corridor: "I-95",
    category: "safety",
    estimatedCost: 67500000,
    unfundedAmount: 67500000,
    status: "unfunded",
    readiness: "preliminary-design",
    designPercent: 30,
    modes: ["auto", "freight"],
    yearNeeded: 2028,
    crashHistory: { fatalities5yr: 5, seriousInjuries5yr: 27, highCrashLocation: true },
    equity: { disadvantagedCommunity: false, rural: false, environmentalJustice: false },
    tags: ["interstate", "interchange", "freight", "wrong-way", "high-crash"],
  },
  {
    unifierId: "UNF-1007",
    name: "Statewide Vulnerable Road User Safety Action Plan Update",
    description:
      "Data-driven update to Delaware's VRU safety action plan, including equity analysis, high-injury network refresh, and implementation strategy.",
    county: "Kent",
    corridor: "Statewide",
    category: "planning",
    estimatedCost: 1800000,
    unfundedAmount: 1800000,
    status: "unfunded",
    readiness: "planning",
    designPercent: 10,
    modes: ["pedestrian", "bicycle"],
    yearNeeded: 2025,
    crashHistory: { fatalities5yr: 21, seriousInjuries5yr: 140, highCrashLocation: true },
    equity: { disadvantagedCommunity: true, rural: true, environmentalJustice: true },
    tags: ["safety-plan", "vru", "data-driven", "equity", "planning"],
  },
  {
    unifierId: "UNF-1008",
    name: "SR 1 Coastal Resilience and Flood Mitigation",
    description:
      "Raise and armor critical SR 1 segments that flood during coastal storms, protecting an evacuation route and seasonal economy.",
    county: "Sussex",
    corridor: "SR 1",
    category: "resilience",
    estimatedCost: 54000000,
    unfundedAmount: 54000000,
    status: "unfunded",
    readiness: "preliminary-design",
    designPercent: 25,
    modes: ["auto", "transit", "freight"],
    yearNeeded: 2028,
    crashHistory: { fatalities5yr: 1, seriousInjuries5yr: 6, highCrashLocation: false },
    equity: { disadvantagedCommunity: false, rural: false, environmentalJustice: false },
    tags: ["flood", "sea-level", "evacuation", "coastal", "resilience"],
  },
  {
    unifierId: "UNF-1009",
    name: "US 13 Alternative Fuel Corridor Charging",
    description:
      "DC fast charging sites along the US 13 alternative fuel corridor with rural coverage gaps between Dover and Delmar.",
    county: "Sussex",
    corridor: "US 13",
    category: "ev-charging",
    estimatedCost: 6200000,
    unfundedAmount: 6200000,
    status: "unfunded",
    readiness: "row",
    designPercent: 55,
    modes: ["auto", "freight"],
    yearNeeded: 2026,
    crashHistory: { fatalities5yr: 0, seriousInjuries5yr: 0, highCrashLocation: false },
    equity: { disadvantagedCommunity: false, rural: true, environmentalJustice: false },
    tags: ["ev", "corridor", "alternative-fuel", "rural"],
  },
  {
    unifierId: "UNF-1010",
    name: "Newark Bicycle Boulevard and School Access",
    description:
      "Low-stress bicycle boulevard connecting neighborhoods, UD campus, and elementary schools with traffic calming and crossing improvements.",
    county: "New Castle",
    corridor: "SR 896",
    category: "bike-ped",
    estimatedCost: 4100000,
    unfundedAmount: 4100000,
    status: "unfunded",
    readiness: "construction-ready",
    designPercent: 90,
    modes: ["bicycle", "pedestrian"],
    yearNeeded: 2025,
    crashHistory: { fatalities5yr: 1, seriousInjuries5yr: 9, highCrashLocation: false },
    equity: { disadvantagedCommunity: false, rural: false, environmentalJustice: false },
    tags: ["bicycle", "school", "traffic-calming", "vru", "complete-streets"],
  },
  {
    unifierId: "UNF-1011",
    name: "Seaford US 13 Freight Bottleneck Relief",
    description:
      "Intersection capacity, turning-radius, and signal timing improvements for agricultural and industrial freight on US 13 in western Sussex.",
    county: "Sussex",
    corridor: "US 13",
    category: "freight",
    estimatedCost: 15300000,
    unfundedAmount: 15300000,
    status: "unfunded",
    readiness: "preliminary-design",
    designPercent: 40,
    modes: ["freight", "auto"],
    yearNeeded: 2027,
    crashHistory: { fatalities5yr: 2, seriousInjuries5yr: 11, highCrashLocation: false },
    equity: { disadvantagedCommunity: true, rural: true, environmentalJustice: false },
    tags: ["freight", "bottleneck", "rural", "signal", "agriculture"],
  },
  {
    unifierId: "UNF-1012",
    name: "Statewide Pavement Preservation Package FY26",
    description:
      "Preventive pavement treatments on NHS and state routes to extend service life. Limited safety or equity components.",
    county: "Kent",
    corridor: "Statewide",
    category: "pavement",
    estimatedCost: 28000000,
    unfundedAmount: 28000000,
    status: "unfunded",
    readiness: "construction-ready",
    designPercent: 100,
    modes: ["auto"],
    yearNeeded: 2026,
    crashHistory: { fatalities5yr: 0, seriousInjuries5yr: 2, highCrashLocation: false },
    equity: { disadvantagedCommunity: false, rural: true, environmentalJustice: false },
    tags: ["pavement", "preservation", "state-of-good-repair"],
  },
  {
    unifierId: "UNF-1013",
    name: "Claymont I-495 Local Access Safety Retrofit",
    description:
      "Pedestrian overpass approach lighting, barrier upgrades, and speed management on local streets feeding I-495 ramps.",
    county: "New Castle",
    corridor: "I-495",
    category: "safety",
    estimatedCost: 8700000,
    unfundedAmount: 8700000,
    status: "unfunded",
    readiness: "final-design",
    designPercent: 65,
    modes: ["auto", "pedestrian"],
    yearNeeded: 2026,
    crashHistory: { fatalities5yr: 3, seriousInjuries5yr: 18, highCrashLocation: true },
    equity: { disadvantagedCommunity: true, rural: false, environmentalJustice: true },
    tags: ["safety", "pedestrian", "lighting", "speed-management", "equity"],
  },
  {
    unifierId: "UNF-1014",
    name: "Milford SR 1 / SR 14 Systemic Lane Departure Countermeasures",
    description:
      "Rumble strips, high-friction surface treatment, and curve warning upgrades on a rural fatal crash corridor.",
    county: "Kent",
    corridor: "SR 1",
    category: "safety",
    estimatedCost: 5300000,
    unfundedAmount: 5300000,
    status: "unfunded",
    readiness: "construction-ready",
    designPercent: 85,
    modes: ["auto"],
    yearNeeded: 2025,
    crashHistory: { fatalities5yr: 7, seriousInjuries5yr: 22, highCrashLocation: true },
    equity: { disadvantagedCommunity: false, rural: true, environmentalJustice: false },
    tags: ["lane-departure", "rural", "high-friction", "systemic", "safety"],
  },
  {
    unifierId: "UNF-1015",
    name: "Georgetown Downtown Multimodal Safety Project",
    description:
      "Road diet, on-street parking reconfiguration, ADA ramps, and pedestrian lighting in Georgetown's downtown core.",
    county: "Sussex",
    corridor: "US 113",
    category: "complete-streets",
    estimatedCost: 6900000,
    unfundedAmount: 6900000,
    status: "unfunded",
    readiness: "final-design",
    designPercent: 72,
    modes: ["auto", "pedestrian", "bicycle"],
    yearNeeded: 2026,
    crashHistory: { fatalities5yr: 2, seriousInjuries5yr: 16, highCrashLocation: true },
    equity: { disadvantagedCommunity: true, rural: true, environmentalJustice: true },
    tags: ["road-diet", "ada", "downtown", "equity", "complete-streets", "safety"],
  },
];

const TEMPLATES: Array<{
  category: ProjectCategory;
  name: (place: string, corridor: string, n: number) => string;
  description: (place: string, corridor: string) => string;
  tags: string[];
  modes: string[];
  cost: [number, number];
}> = [
  {
    category: "safety",
    name: (place, corridor) => `${corridor} ${place} Intersection Safety Package`,
    description: (place, corridor) =>
      `Signal timing, visibility, and pedestrian interval upgrades at ${corridor} intersections serving ${place}.`,
    tags: ["intersection", "signal", "safety", "pedestrian"],
    modes: ["auto", "pedestrian"],
    cost: [2_500_000, 16_000_000],
  },
  {
    category: "bike-ped",
    name: (place) => `${place} Sidewalk and Crossing Gap Closure`,
    description: (place, corridor) =>
      `Fill sidewalk gaps and add high-visibility crossings along ${corridor} in ${place}, with ADA curb ramps.`,
    tags: ["pedestrian", "ada", "crossing", "vru"],
    modes: ["pedestrian", "bicycle"],
    cost: [1_200_000, 8_500_000],
  },
  {
    category: "bridge",
    name: (place, corridor) => `${corridor} Bridge Preservation — ${place}`,
    description: (place, corridor) =>
      `Deck overlay, joint replacement, and scour countermeasures on the ${corridor} bridge near ${place}.`,
    tags: ["bridge", "preservation", "state-of-good-repair"],
    modes: ["auto", "freight"],
    cost: [4_000_000, 38_000_000],
  },
  {
    category: "pavement",
    name: (place, corridor) => `${corridor} Pavement Rehab — ${place} Section`,
    description: (place, corridor) =>
      `Mill and overlay of deteriorated ${corridor} lanes through ${place} to restore ride quality.`,
    tags: ["pavement", "preservation"],
    modes: ["auto"],
    cost: [3_000_000, 22_000_000],
  },
  {
    category: "signals",
    name: (place, corridor) => `${place} Adaptive Signal System on ${corridor}`,
    description: (place, corridor) =>
      `Adaptive signal control, detection, and communications along ${corridor} in ${place}.`,
    tags: ["signal", "operations", "congestion", "safety"],
    modes: ["auto", "transit"],
    cost: [1_800_000, 9_000_000],
  },
  {
    category: "resilience",
    name: (place, corridor) => `${corridor} Drainage and Flood Mitigation — ${place}`,
    description: (place, corridor) =>
      `Stormwater upgrades and roadway raising where ${corridor} floods near ${place}.`,
    tags: ["flood", "drainage", "resilience"],
    modes: ["auto"],
    cost: [5_000_000, 32_000_000],
  },
  {
    category: "transit",
    name: (place) => `${place} DART Stop and Access Improvements`,
    description: (place, corridor) =>
      `Accessible pads, shelters, lighting, and sidewalk connections to DART stops on ${corridor} in ${place}.`,
    tags: ["transit", "equity", "pedestrian", "ada"],
    modes: ["transit", "pedestrian"],
    cost: [900_000, 6_500_000],
  },
  {
    category: "freight",
    name: (place) => `${place} Truck Route Geometric Improvements`,
    description: (place, corridor) =>
      `Widen turning radii and upgrade shoulders for freight movements on ${corridor} near ${place}.`,
    tags: ["freight", "geometry", "shoulders"],
    modes: ["freight", "auto"],
    cost: [4_500_000, 19_000_000],
  },
  {
    category: "complete-streets",
    name: (place, corridor) => `${place} Complete Streets — ${corridor} Town Center`,
    description: (place, corridor) =>
      `Lane reallocation, bicycle facilities, and pedestrian lighting on ${corridor} through ${place} town center.`,
    tags: ["complete-streets", "bike-ped", "equity", "safety"],
    modes: ["auto", "pedestrian", "bicycle"],
    cost: [3_500_000, 18_000_000],
  },
  {
    category: "ev-charging",
    name: (place) => `${place} Community Charging Hub`,
    description: (place, corridor) =>
      `Public DC fast charging adjacent to ${corridor} serving ${place} residents without home charging.`,
    tags: ["ev", "equity", "community"],
    modes: ["auto"],
    cost: [800_000, 4_200_000],
  },
  {
    category: "planning",
    name: (place) => `${place} Local Road Safety Plan`,
    description: (place) =>
      `Data-driven local road safety plan for ${place} identifying a high-injury network and proven countermeasures.`,
    tags: ["safety-plan", "data-driven", "planning"],
    modes: ["auto", "pedestrian"],
    cost: [250_000, 1_200_000],
  },
];

function mulberry32(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]!;
}

function lerp(rand: () => number, min: number, max: number) {
  return min + rand() * (max - min);
}

export const TARGET_PROJECT_COUNT = 248;

export function getUnfundedProjects(): Project[] {
  const rand = mulberry32(202407);
  const projects: Project[] = FEATURED.map((spec, i) => ({
    id: `proj-${String(i + 1).padStart(3, "0")}`,
    ...spec,
  }));

  let n = projects.length;
  while (projects.length < TARGET_PROJECT_COUNT) {
    const county = pick(rand, COUNTIES);
    const place = pick(rand, PLACES[county]);
    const corridor = pick(rand, CORRIDORS);
    const template = pick(rand, TEMPLATES);
    const cost = Math.round(lerp(rand, template.cost[0], template.cost[1]) / 10000) * 10000;
    const designPercent = Math.round(lerp(rand, 5, 100));
    const readiness =
      designPercent >= 85
        ? "construction-ready"
        : designPercent >= 60
          ? "final-design"
          : designPercent >= 35
            ? "row"
            : designPercent >= 20
              ? "preliminary-design"
              : "planning";
    const fatalities = template.category === "safety" || template.category === "bike-ped"
      ? Math.floor(rand() * 6)
      : Math.floor(rand() * 2);
    const injuries = fatalities * 4 + Math.floor(rand() * 12);
    n += 1;
    projects.push({
      id: `proj-${String(n).padStart(3, "0")}`,
      unifierId: `UNF-${2000 + n}`,
      name: template.name(place, corridor, n),
      description: template.description(place, corridor),
      county,
      corridor,
      category: template.category,
      estimatedCost: cost,
      unfundedAmount: Math.round(cost * (0.75 + rand() * 0.25)),
      status: rand() > 0.82 ? "partially-funded" : "unfunded",
      readiness,
      designPercent,
      modes: template.modes,
      yearNeeded: 2025 + Math.floor(rand() * 5),
      crashHistory: {
        fatalities5yr: fatalities,
        seriousInjuries5yr: injuries,
        highCrashLocation: fatalities >= 2 || injuries >= 15,
      },
      equity: {
        disadvantagedCommunity: rand() > 0.55,
        rural: county !== "New Castle" && rand() > 0.35,
        environmentalJustice: rand() > 0.7,
      },
      tags: [...template.tags],
    });
  }

  return projects;
}

export function projectsToCsv(projects: Project[]): string {
  const headers = [
    "Unifier ID",
    "Project Name",
    "Description",
    "County",
    "Corridor",
    "Category",
    "Estimated Cost",
    "Unfunded Amount",
    "Status",
    "Readiness",
    "Design Percent",
    "Modes",
    "Year Needed",
    "Fatalities 5yr",
    "Serious Injuries 5yr",
    "High Crash Location",
    "Disadvantaged Community",
    "Rural",
    "Environmental Justice",
    "Tags",
  ];
  const rows = projects.map((p) =>
    [
      p.unifierId,
      csvEscape(p.name),
      csvEscape(p.description),
      p.county,
      p.corridor,
      p.category,
      p.estimatedCost,
      p.unfundedAmount,
      p.status,
      p.readiness,
      p.designPercent,
      p.modes.join("; "),
      p.yearNeeded,
      p.crashHistory.fatalities5yr,
      p.crashHistory.seriousInjuries5yr,
      p.crashHistory.highCrashLocation,
      p.equity.disadvantagedCommunity,
      p.equity.rural,
      p.equity.environmentalJustice,
      p.tags.join("; "),
    ].join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
