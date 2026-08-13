import * as XLSX from "xlsx";
import type { Project, ProjectCategory, ReadinessStage } from "./types";
import { getUnfundedProjects } from "./sample-projects";

const CATEGORY_ALIASES: Record<string, ProjectCategory> = {
  safety: "safety",
  "bike-ped": "bike-ped",
  bikeped: "bike-ped",
  bicycle: "bike-ped",
  pedestrian: "bike-ped",
  bridge: "bridge",
  pavement: "pavement",
  transit: "transit",
  freight: "freight",
  resilience: "resilience",
  "ev-charging": "ev-charging",
  ev: "ev-charging",
  charging: "ev-charging",
  planning: "planning",
  signals: "signals",
  signal: "signals",
  "complete-streets": "complete-streets",
  completestreets: "complete-streets",
};

function norm(value: unknown): string {
  return String(value ?? "").trim();
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown): boolean {
  const s = norm(value).toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

function categoryOf(value: string): ProjectCategory {
  const key = value.toLowerCase().replace(/\s+/g, "-");
  return CATEGORY_ALIASES[key] ?? "safety";
}

function readinessOf(value: string, designPercent: number): ReadinessStage {
  const key = value.toLowerCase().replace(/\s+/g, "-");
  const allowed: ReadinessStage[] = [
    "planning",
    "preliminary-design",
    "final-design",
    "row",
    "construction-ready",
  ];
  if (allowed.includes(key as ReadinessStage)) return key as ReadinessStage;
  if (designPercent >= 85) return "construction-ready";
  if (designPercent >= 60) return "final-design";
  if (designPercent >= 35) return "row";
  if (designPercent >= 20) return "preliminary-design";
  return "planning";
}

function countyOf(value: string): Project["county"] {
  const s = value.toLowerCase();
  if (s.includes("sussex")) return "Sussex";
  if (s.includes("kent")) return "Kent";
  return "New Castle";
}

function pick(row: Record<string, unknown>, names: string[]): unknown {
  const entries = Object.entries(row);
  for (const name of names) {
    const hit = entries.find(([k]) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === name.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (hit) return hit[1];
  }
  return undefined;
}

export function parseProjectWorkbook(buffer: Buffer): Project[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!rows.length) return [];

  return rows.map((row, i) => {
    const designPercent = num(pick(row, ["Design Percent", "designPercent", "Design%"]), 40);
    const name = norm(pick(row, ["Project Name", "name", "Project"])) || `Imported project ${i + 1}`;
    const description = norm(pick(row, ["Description", "Scope", "Notes"])) || name;
    const tags = norm(pick(row, ["Tags"]))
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const modes = norm(pick(row, ["Modes"]))
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean);
    return {
      id: `imp-${String(i + 1).padStart(3, "0")}`,
      unifierId: norm(pick(row, ["Unifier ID", "unifierId", "ID"])) || `UNF-IMP-${i + 1}`,
      name,
      description,
      county: countyOf(norm(pick(row, ["County"]))),
      corridor: norm(pick(row, ["Corridor", "Route"])) || "Statewide",
      category: categoryOf(norm(pick(row, ["Category", "Type"]))),
      estimatedCost: num(pick(row, ["Estimated Cost", "Cost"])),
      unfundedAmount: num(pick(row, ["Unfunded Amount", "Unfunded", "Request"])),
      status: /partial/i.test(norm(pick(row, ["Status"]))) ? "partially-funded" : "unfunded",
      readiness: readinessOf(norm(pick(row, ["Readiness", "Phase"])), designPercent),
      designPercent,
      modes: modes.length ? modes : ["auto"],
      yearNeeded: num(pick(row, ["Year Needed", "Year"]), 2026),
      crashHistory: {
        fatalities5yr: num(pick(row, ["Fatalities 5yr", "Fatalities"])),
        seriousInjuries5yr: num(pick(row, ["Serious Injuries 5yr", "Injuries"])),
        highCrashLocation: bool(pick(row, ["High Crash Location"])),
      },
      equity: {
        disadvantagedCommunity: bool(pick(row, ["Disadvantaged Community"])),
        rural: bool(pick(row, ["Rural"])),
        environmentalJustice: bool(pick(row, ["Environmental Justice"])),
      },
      tags,
    } satisfies Project;
  });
}

export function parseProjectCsv(text: string): Project[] {
  return parseProjectWorkbook(Buffer.from(text, "utf8"));
}

export function defaultProjects(): Project[] {
  return getUnfundedProjects();
}
