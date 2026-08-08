/**
 * Recompute draft salaries on the existing career pool using a peak-rate +
 * bulk blend (mirrors salary_from_value in ingest_fangraphs_careers.py).
 * No FanGraphs re-download needed — works from data/career_players.json.
 *
 * Then run `npm run db:reseed` (or db:setup) and `npm run demo:build`.
 */
import fs from "node:fs";
import path from "node:path";

type Card = {
  name: string;
  isPitcher: boolean;
  careerWAR?: number;
  careerPA?: number;
  careerIP?: number;
  salary: number;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export function salaryFromValue(
  war: number,
  playingTime: number,
  isPitcher: boolean,
): number {
  const w = Math.max(-2, war);
  let raw: number;
  if (isPitcher) {
    const full = Math.max(playingTime, 1) / 200; // ~200 IP season
    const perSeason = clamp(w / full, -1, 8);
    const bulk = w <= 80 ? w : 80 + (w - 80) * 0.45;
    raw = 500_000 + perSeason * 2_300_000 + Math.max(0, bulk) * 120_000;
  } else {
    const full = Math.max(playingTime, 1) / 650; // ~650 PA season
    const perSeason = clamp(w / full, -1, 9);
    const bulk = w <= 80 ? w : 80 + (w - 80) * 0.45;
    raw = 500_000 + perSeason * 2_200_000 + Math.max(0, bulk) * 130_000;
  }
  const salary = Math.round(raw / 100_000) * 100_000;
  return clamp(salary, 500_000, 32_000_000);
}

function fmt(n: number) {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

function main() {
  const file = path.join(process.cwd(), "data", "career_players.json");
  const cards = JSON.parse(fs.readFileSync(file, "utf8")) as Card[];

  const samples = new Map<string, { before: number; after: number }>();
  const watch = [
    "Barry Bonds",
    "Harold Baines",
    "Travis Hafner",
    "Greg Maddux",
    "Mariano Rivera",
    "Mike Trout",
  ];

  for (const c of cards) {
    const before = c.salary;
    const pt = c.isPitcher ? (c.careerIP ?? 0) : (c.careerPA ?? 0);
    c.salary = salaryFromValue(c.careerWAR ?? 0, pt, c.isPitcher);
    if (watch.includes(c.name)) {
      samples.set(c.name, { before, after: c.salary });
    }
  }

  fs.writeFileSync(file, JSON.stringify(cards));

  console.log(`Recomputed ${cards.length} salaries → ${file}`);
  for (const name of watch) {
    const s = samples.get(name);
    if (s) console.log(`  ${name}: ${fmt(s.before)} → ${fmt(s.after)}`);
  }
}

main();
