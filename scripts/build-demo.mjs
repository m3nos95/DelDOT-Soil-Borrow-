#!/usr/bin/env node
/**
 * Rebuild the standalone HTML demo assets:
 * - demo/sim.bundle.js  (esbuild IIFE of src/lib/sim.ts)
 * - demo/players.embed.js + demo/players.json (star subset)
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

const batters = all
  .filter((p) => !p.isPitcher)
  .sort((a, b) => b.careerWAR - a.careerWAR)
  .slice(0, 40);
const pitchers = all
  .filter((p) => p.isPitcher)
  .sort((a, b) => b.careerWAR - a.careerWAR)
  .slice(0, 30);
// Prefer a couple of true short-outing arms for the pen demo
const closers = all
  .filter(
    (p) =>
      p.isPitcher &&
      (p.durability ?? 99) < 60 &&
      !pitchers.some((x) => x.fangraphsId === p.fangraphsId),
  )
  .sort((a, b) => b.careerWAR - a.careerWAR)
  .slice(0, 5);

const stars = [...batters, ...pitchers, ...closers];
const seen = new Set();
const unique = stars.filter((p) => {
  if (seen.has(p.fangraphsId)) return false;
  seen.add(p.fangraphsId);
  return true;
});

writeFileSync(join(demoDir, "players.json"), JSON.stringify(unique, null, 0));
writeFileSync(
  join(demoDir, "players.embed.js"),
  "window.DEMO_PLAYERS = " + JSON.stringify(unique) + ";\n",
);

console.log(
  `demo ready: ${unique.length} players → demo/players.embed.js + sim.bundle.js`,
);
