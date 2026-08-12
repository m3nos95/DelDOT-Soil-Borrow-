#!/usr/bin/env node
/**
 * Rebuild the standalone HTML demo assets:
 * - demo/sim.bundle.js  (esbuild IIFE of src/lib/sim.ts)
 * - demo/players.embed.js + demo/players.json (stars per dynasty era)
 *
 * Full career pool stays in the Next.js app (data/career_players.json).
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = join(root, "demo");
mkdirSync(demoDir, { recursive: true });

await build({
  entryPoints: [join(root, "src/lib/sim.ts")],
  bundle: true,
  format: "iife",
  globalName: "HardballSim",
  outfile: join(demoDir, "sim.bundle.js"),
  platform: "browser",
  target: ["es2018"],
});

const all = JSON.parse(
  readFileSync(join(root, "data/career_players.json"), "utf8"),
);

/** Keep in sync with DYNASTY_ERAS in src/lib/environment.ts */
const ERAS = [
  { id: "pre1950", yearFrom: 1871, yearTo: 1949, minOverlap: 3 },
  { id: "classic", yearFrom: 1950, yearTo: 1979, minOverlap: 3 },
  { id: "freeagent", yearFrom: 1980, yearTo: 1999, minOverlap: 3 },
  { id: "modern", yearFrom: 2000, yearTo: 2025, minOverlap: 3 },
];

function inEra(p, era) {
  const start = Math.max(p.yearFrom, era.yearFrom);
  const end = Math.min(p.yearTo, era.yearTo);
  return end - start + 1 >= era.minOverlap;
}

const seen = new Set();
const unique = [];

function take(list, n) {
  for (const p of list) {
    if (seen.has(p.fangraphsId)) continue;
    seen.add(p.fangraphsId);
    unique.push(p);
    if (--n <= 0) break;
  }
}

// Top stars overall (for open / chaos)
take(
  all.filter((p) => !p.isPitcher).sort((a, b) => b.careerWAR - a.careerWAR),
  30,
);
take(
  all.filter((p) => p.isPitcher).sort((a, b) => b.careerWAR - a.careerWAR),
  24,
);

// Ensure each locked era has enough bats/arms for a two-club demo
for (const era of ERAS) {
  const bats = all
    .filter((p) => !p.isPitcher && inEra(p, era))
    .sort((a, b) => b.careerWAR - a.careerWAR);
  const arms = all
    .filter((p) => p.isPitcher && inEra(p, era))
    .sort((a, b) => b.careerWAR - a.careerWAR);
  take(bats, 22);
  take(arms, 16);
}

// A few short-outing arms for pen roles
take(
  all
    .filter((p) => p.isPitcher && (p.durability ?? 99) < 60)
    .sort((a, b) => b.careerWAR - a.careerWAR),
  6,
);

writeFileSync(join(demoDir, "players.json"), JSON.stringify(unique, null, 0));
writeFileSync(
  join(demoDir, "players.embed.js"),
  "window.DEMO_PLAYERS = " + JSON.stringify(unique) + ";\n",
);

const counts = Object.fromEntries(
  [...ERAS, { id: "open", yearFrom: 1871, yearTo: 2025, minOverlap: 1 }].map(
    (era) => {
      const pool = unique.filter((p) => inEra(p, era));
      return [
        era.id,
        `${pool.filter((p) => !p.isPitcher).length}b/${pool.filter((p) => p.isPitcher).length}p`,
      ];
    },
  ),
);

console.log(
  `demo ready: ${unique.length} players → demo/players.embed.js + sim.bundle.js`,
  counts,
);
