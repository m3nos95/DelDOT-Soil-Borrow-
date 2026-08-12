/**
 * Cap-reserve guards for snake draft.
 * Run: npx tsx scripts/test-cap.ts
 */
import {
  canAffordDraftPick,
  maxAffordableBid,
  MIN_PLAYER_SALARY,
} from "../src/lib/cap";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Empty roster, 22 rounds, $120M cap → max bid leaves 21 * 500k
const early = maxAffordableBid(0, 120_000_000, 0, 22);
assert(early === 120_000_000 - 21 * MIN_PLAYER_SALARY, `early max ${early}`);

// Block a $32M pick that strands later slots when nearly full of spend
const broke = canAffordDraftPick({
  payroll: 110_000_000,
  salaryCap: 120_000_000,
  rosterLen: 10,
  draftRounds: 22,
  pickSalary: 9_000_000,
  hitters: 5,
  pitchers: 5,
  pickingPitcher: false,
});
assert(!broke.ok, "should block overspend that strands later picks");

// Cheap filler always OK mid-draft
const ok = canAffordDraftPick({
  payroll: 40_000_000,
  salaryCap: 120_000_000,
  rosterLen: 8,
  draftRounds: 22,
  pickSalary: 2_000_000,
  hitters: 5,
  pitchers: 3,
  pickingPitcher: true,
});
assert(ok.ok, "affordable arm should pass");

// Force pitcher when short on arms with few picks left
const needArms = canAffordDraftPick({
  payroll: 50_000_000,
  salaryCap: 120_000_000,
  rosterLen: 18,
  draftRounds: 22,
  pickSalary: 500_000,
  hitters: 16,
  pitchers: 2,
  pickingPitcher: false,
});
assert(!needArms.ok, "must draft pitchers when short");

console.log("cap tests OK");
