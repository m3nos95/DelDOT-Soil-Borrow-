/**
 * Recompute draft salaries on the existing career pool using a peak-rate +
 * bulk blend (mirrors salary_from_value in ingest_fangraphs_careers.py).
 * No FanGraphs re-download needed — works from data/career_players.json.
 *
 * Peak rate is credibility-weighted by playing time so cup-of-coffee spikes
 * (4 PA / 0.2 WAR) cannot price like Andruw Jones.
 *
 * Usage:
 *   npm run db:salaries              # rewrite JSON only
 *   npm run db:salaries -- --apply   # also patch salaries in the local DB
 * Then restart `npm run dev` (reseed not required for salary-only updates).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Card = {
  fangraphsId?: number;
  name: string;
  isPitcher: boolean;
  careerWAR?: number;
  careerPA?: number;
  careerIP?: number;
  salary: number;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/**
 * Blend peak rate (WAR / season) with career bulk WAR.
 *
 * Credibility ramps to 1.0 over one full season (~650 PA / ~200 IP).
 * Rate is Bayesian-shrunk toward 0 with a 0.5-season prior so tiny samples
 * cannot max the peak term.
 */
export function salaryFromValue(
  war: number,
  playingTime: number,
  isPitcher: boolean,
): number {
  const w = Math.max(-2, war);
  const seasonSize = isPitcher ? 200 : 650;
  const seasons = Math.max(playingTime, 0) / seasonSize;
  const credibility = clamp(seasons / 1.0, 0, 1);
  const shrunkRate = w / (seasons + 0.5);
  const perSeason = clamp(shrunkRate, -1, isPitcher ? 8 : 9);
  const bulk = w <= 80 ? w : 80 + (w - 80) * 0.45;
  const peakPay = isPitcher ? 2_300_000 : 2_200_000;
  const bulkPay = isPitcher ? 120_000 : 130_000;
  const raw =
    500_000 + credibility * perSeason * peakPay + Math.max(0, bulk) * bulkPay;
  const salary = Math.round(raw / 100_000) * 100_000;
  return clamp(salary, 500_000, 32_000_000);
}

function fmt(n: number) {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

async function applyToDb(cards: Card[]) {
  const { makePrismaClient, targetLabel } = await import("./prisma-client");
  const prisma = makePrismaClient();
  console.log(`Applying salaries → ${targetLabel}`);
  let updated = 0;
  const chunk = 200;
  for (let i = 0; i < cards.length; i += chunk) {
    const slice = cards.slice(i, i + chunk);
    await Promise.all(
      slice.map(async (c) => {
        if (c.fangraphsId == null) return;
        const res = await prisma.player.updateMany({
          where: { fangraphsId: c.fangraphsId },
          data: { salary: c.salary },
        });
        updated += res.count;
      }),
    );
  }
  await prisma.$disconnect();
  console.log(`Updated ${updated} player rows in DB`);
}

async function main() {
  const file = path.join(process.cwd(), "data", "career_players.json");
  const cards = JSON.parse(fs.readFileSync(file, "utf8")) as Card[];
  const apply = process.argv.includes("--apply");

  const samples = new Map<string, { before: number; after: number; pt: number; war: number }>();
  const watch = [
    "Barry Bonds",
    "Andruw Jones",
    "Harold Baines",
    "Travis Hafner",
    "Greg Maddux",
    "Mariano Rivera",
    "Mike Trout",
    "Jeff Bittiger",
    "Ron Wotus",
  ];

  for (const c of cards) {
    const before = c.salary;
    const pt = c.isPitcher ? (c.careerIP ?? 0) : (c.careerPA ?? 0);
    c.salary = salaryFromValue(c.careerWAR ?? 0, pt, c.isPitcher);
    if (watch.includes(c.name)) {
      samples.set(c.name, {
        before,
        after: c.salary,
        pt,
        war: c.careerWAR ?? 0,
      });
    }
  }

  // Sanity: nobody with <100 PA (hitters) or <25 IP (pitchers) should clear $3M
  const overpaidCups = cards.filter((c) => {
    const pt = c.isPitcher ? (c.careerIP ?? 0) : (c.careerPA ?? 0);
    const min = c.isPitcher ? 25 : 100;
    return pt < min && c.salary > 3_000_000;
  });

  fs.writeFileSync(file, JSON.stringify(cards));

  console.log(`Recomputed ${cards.length} salaries → ${file}`);
  for (const name of watch) {
    const s = samples.get(name);
    if (s) {
      console.log(
        `  ${name}: ${fmt(s.before)} → ${fmt(s.after)} (${s.war.toFixed(1)} WAR / ${s.pt.toFixed(0)} PT)`,
      );
    }
  }
  if (overpaidCups.length) {
    console.warn(
      `WARNING: ${overpaidCups.length} tiny-sample players still > $3M (e.g. ${overpaidCups[0]?.name})`,
    );
  } else {
    console.log("OK: no sub-100 PA / sub-25 IP player above $3M");
  }

  if (apply) {
    await applyToDb(cards);
  }
}

const isDirect =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
