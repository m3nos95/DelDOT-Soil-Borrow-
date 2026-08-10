/**
 * Snake-draft order + exclusivity helpers.
 * Run: npm run test:draft
 */
import {
  draftRound,
  isDraftComplete,
  teamIndexOnClock,
  totalDraftPicks,
} from "../src/lib/draft";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// 4-team snake: 0,1,2,3, 3,2,1,0, 0,1,...
assert(teamIndexOnClock(0, 4) === 0, "pick 1 → team 0");
assert(teamIndexOnClock(1, 4) === 1, "pick 2 → team 1");
assert(teamIndexOnClock(3, 4) === 3, "pick 4 → team 3");
assert(teamIndexOnClock(4, 4) === 3, "pick 5 → team 3 (snake)");
assert(teamIndexOnClock(5, 4) === 2, "pick 6 → team 2");
assert(teamIndexOnClock(7, 4) === 0, "pick 8 → team 0");
assert(teamIndexOnClock(8, 4) === 0, "pick 9 → team 0");

assert(totalDraftPicks(6, 20) === 120, "6x20 picks");
assert(draftRound(0, 6) === 1, "round 1");
assert(draftRound(6, 6) === 2, "round 2");
assert(!isDraftComplete(119, 6, 20), "119 not done");
assert(isDraftComplete(120, 6, 20), "120 done");

console.log("draft tests OK");
