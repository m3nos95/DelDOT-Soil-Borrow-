/**
 * Staff construction + rotation: 5 SP required, distinct starters by day.
 * Run: npm run test:staff
 */
import {
  buildDefaultStaff,
  countPitcherBuckets,
  MIN_PITCHERS,
  MIN_RELIEVERS,
  MIN_STARTERS,
  pitcherRole,
  validateStaffSlots,
} from "../src/lib/staff";
import { teamIndexOnClock } from "../src/lib/draft";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(pitcherRole({ isPitcher: true, description: "… · SP · two-way" }) === "SP", "SP tag");
assert(pitcherRole({ isPitcher: true, description: "… · RP · two-way" }) === "RP", "RP tag");
assert(pitcherRole({ isPitcher: true, durability: 90 }) === "SP", "durable fallback");
assert(pitcherRole({ isPitcher: true, durability: 40 }) === "RP", "short fallback");

const randy = {
  id: "rj",
  isPitcher: true,
  description: "Career · SP",
  careerWAR: 110,
  durability: 99,
};
const pedro = {
  id: "pm",
  isPitcher: true,
  description: "Career · SP",
  careerWAR: 80,
  durability: 70,
};
const unit = {
  id: "cu",
  isPitcher: true,
  description: "Career · SP",
  careerWAR: 60,
  durability: 75,
};
const glavin = {
  id: "tg",
  isPitcher: true,
  description: "Career · SP",
  careerWAR: 70,
  durability: 80,
};
const smoltz = {
  id: "js",
  isPitcher: true,
  description: "Career · SP",
  careerWAR: 65,
  durability: 78,
};
const mo = {
  id: "mr",
  isPitcher: true,
  description: "Career · RP",
  careerWAR: 40,
  durability: 55,
};
const hoff = {
  id: "th",
  isPitcher: true,
  description: "Career · RP",
  careerWAR: 25,
  durability: 50,
};
const wagner = {
  id: "bw",
  isPitcher: true,
  description: "Career · RP",
  careerWAR: 22,
  durability: 48,
};

const staff = buildDefaultStaff([
  randy,
  pedro,
  unit,
  glavin,
  smoltz,
  mo,
  hoff,
  wagner,
]);
const err = validateStaffSlots(staff);
assert(err == null, `staff should validate: ${err}`);
assert(
  staff.filter((s) => s.role.startsWith("SP")).length === MIN_STARTERS,
  "5 SP slots",
);
assert(
  staff.filter((s) => !s.role.startsWith("SP")).length >= MIN_RELIEVERS,
  "pen depth",
);
assert(staff.find((s) => s.role === "SP1")?.playerId === "rj", "ace SP1");
assert(staff.find((s) => s.role === "CL")?.playerId === "mr", "Mo closes");

// One-ace staff is invalid
assert(
  validateStaffSlots([{ playerId: "rj", role: "SP1" }]) != null,
  "single SP rejected",
);

const buckets = countPitcherBuckets([randy, mo, hoff]);
assert(buckets.sp === 1 && buckets.rp === 2, "bucket counts");
assert(MIN_PITCHERS === 8, "min pitchers");

// Sanity: snake order still alternates (rotation uses day % 5 in league.ts)
assert(teamIndexOnClock(0, 5) === 0, "clock");
assert(teamIndexOnClock(5, 5) === 4, "snake");

console.log("staff tests OK");
