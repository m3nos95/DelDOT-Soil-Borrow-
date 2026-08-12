/**
 * Strategic draft scoring — build a real club.
 * Run: npx tsx scripts/test-draft-strategy.ts
 */
import {
  hitterSlot,
  roundBudget,
  scoreDraftCandidate,
  selectStrategicPick,
  type DraftCand,
} from "../src/lib/draft-strategy";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function bat(
  partial: Partial<DraftCand> & Pick<DraftCand, "id" | "name" | "primaryPos">,
): DraftCand {
  return {
    isPitcher: false,
    salary: 5_000_000,
    careerWAR: 20,
    durability: 50,
    description: "",
    positions: partial.primaryPos,
    ...partial,
  };
}

function arm(
  partial: Partial<DraftCand> &
    Pick<DraftCand, "id" | "name"> & { role: "SP" | "RP"; war?: number },
): DraftCand {
  return {
    isPitcher: true,
    primaryPos: "P",
    positions: "P",
    salary: partial.role === "SP" ? 8_000_000 : 3_000_000,
    careerWAR: partial.war ?? (partial.role === "SP" ? 30 : 10),
    durability: partial.role === "SP" ? 80 : 45,
    description: `Career · ${partial.role}`,
    ...partial,
  };
}

assert(hitterSlot(bat({ id: "1", name: "C", primaryPos: "C" })) === "C", "C");
assert(roundBudget(0, 100_000_000) >= 30_000_000, "early budget high");
assert(roundBudget(16, 5_000_000) <= 5_000_000, "late budget capped");

const empty: DraftCand[] = [];
const pool: DraftCand[] = [
  bat({ id: "c", name: "Catcher", primaryPos: "C", careerWAR: 25, salary: 6_000_000 }),
  bat({ id: "ss", name: "Short", primaryPos: "SS", careerWAR: 40, salary: 12_000_000 }),
  bat({ id: "1b", name: "First", primaryPos: "1B", careerWAR: 35, salary: 10_000_000 }),
  arm({ id: "ace", name: "Ace", role: "SP", war: 70, salary: 20_000_000 }),
  arm({ id: "sp2", name: "SP2", role: "SP", war: 25, salary: 8_000_000 }),
  arm({ id: "cl", name: "Closer", role: "RP", war: 20, salary: 4_000_000 }),
];

const first = selectStrategicPick({
  roster: empty,
  pool,
  taken: new Set(),
  payroll: 0,
  salaryCap: 120_000_000,
  draftRounds: 22,
  seed: 1,
});
assert(first != null, "first pick exists");
// Empty roster urgently needs lineup + arms — star SS or ace both fine; must be elite
assert(
  (first!.careerWAR >= 40),
  `first pick should be a star, got ${first!.name} ${first!.careerWAR}`,
);

// After a full infield + OF, prefer finishing the rotation
const almost: DraftCand[] = [
  bat({ id: "c", name: "C", primaryPos: "C", careerWAR: 15 }),
  bat({ id: "1b", name: "1B", primaryPos: "1B", careerWAR: 15 }),
  bat({ id: "2b", name: "2B", primaryPos: "2B", careerWAR: 15 }),
  bat({ id: "3b", name: "3B", primaryPos: "3B", careerWAR: 15 }),
  bat({ id: "ss", name: "SS", primaryPos: "SS", careerWAR: 15 }),
  bat({ id: "lf", name: "LF", primaryPos: "LF", careerWAR: 15 }),
  bat({ id: "cf", name: "CF", primaryPos: "CF", careerWAR: 15 }),
  bat({ id: "rf", name: "RF", primaryPos: "RF", careerWAR: 15 }),
  bat({ id: "dh", name: "DH", primaryPos: "DH", careerWAR: 12 }),
  arm({ id: "s1", name: "S1", role: "SP", war: 20 }),
  arm({ id: "s2", name: "S2", role: "SP", war: 18 }),
];
const next = selectStrategicPick({
  roster: almost,
  pool: [
    bat({ id: "bench", name: "Bench", primaryPos: "1B", careerWAR: 8, salary: 2_000_000 }),
    arm({ id: "s3", name: "S3", role: "SP", war: 22, salary: 7_000_000 }),
    arm({ id: "rp", name: "RP", role: "RP", war: 12, salary: 3_000_000 }),
  ],
  taken: new Set(almost.map((p) => p.id)),
  payroll: almost.reduce((s, p) => s + p.salary, 0),
  salaryCap: 120_000_000,
  draftRounds: 22,
  seed: 2,
});
assert(next?.isPitcher === true, `should draft pitching next, got ${next?.name}`);

const sStar = scoreDraftCandidate(
  arm({ id: "a", name: "Ace", role: "SP", war: 80, salary: 25_000_000 }),
  empty,
  [{ kind: "SP", weight: 3, label: "SP" }],
  0,
  1,
);
const sScrub = scoreDraftCandidate(
  bat({ id: "x", name: "Scrub", primaryPos: "DH", careerWAR: 2, salary: 500_000 }),
  empty,
  [{ kind: "SP", weight: 3, label: "SP" }],
  0,
  1,
);
assert(sStar > sScrub, "ace scores over scrub when SP needed");

console.log("draft strategy OK");
