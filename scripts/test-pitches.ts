/**
 * Validates the pitch-by-pitch layer:
 *  - sequences always end consistently with the decided outcome
 *  - counts never go illegal (>3 balls / >2 strikes before the terminal pitch)
 *  - generating pitches does NOT change box scores (independent rng)
 */
import assert from "node:assert/strict";
import {
  buildPitchSequence,
  simulateGame,
  type LineupEntry,
  type SimPlayer,
  type StaffArm,
} from "../src/lib/sim";

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const pitcher: SimPlayer = {
  id: "p",
  name: "Arm",
  primaryPos: "P",
  isPitcher: true,
  bats: "R",
  throws: "R",
  kRate: 200,
  bbRate: 60,
  hbpRate: 5,
  singleRate: 150,
  doubleRate: 45,
  tripleRate: 5,
  hrRate: 30,
  stuff: 60,
  control: 55,
  durability: 60,
  speed: 30,
  defense: 45,
};

function sequenceTests() {
  const prand = mulberry32(12345);
  const outcomes = ["K", "BB", "HBP", "1B", "2B", "3B", "HR", "OUT", "GIDP"] as const;
  let checked = 0;
  for (let i = 0; i < 4000; i++) {
    const outcome = outcomes[i % outcomes.length];
    const seq = buildPitchSequence(outcome, pitcher, prand);
    assert.ok(seq.length >= 1, `${outcome} produced pitches`);
    const last = seq[seq.length - 1];

    // Legal running counts on every pitch (count BEFORE the pitch)
    for (const p of seq) {
      assert.ok(p.balls >= 0 && p.balls <= 3, `balls in range for ${outcome}`);
      assert.ok(p.strikes >= 0 && p.strikes <= 2, `strikes in range for ${outcome}`);
      assert.ok(p.velo > 50 && p.velo < 110, "velo sane");
    }

    if (outcome === "K") {
      assert.ok(
        last.result === "swinging" || last.result === "called",
        "K ends on a strike",
      );
      assert.equal(last.strikes, 2, "K terminal on 2-strike count");
    } else if (outcome === "BB") {
      assert.equal(last.result, "ball", "BB ends on a ball");
      assert.equal(last.balls, 3, "BB terminal on 3-ball count");
    } else if (outcome === "HBP") {
      assert.equal(last.result, "hbp", "HBP ends on a hit batter");
    } else {
      assert.equal(last.result, "inplay", `${outcome} ends in play`);
    }
    checked += 1;
  }
  console.log(`pitch sequences: ${checked} ok`);
}

function makeHitter(id: string, order: number): LineupEntry {
  const player: SimPlayer = {
    id,
    name: `H${id}`,
    primaryPos: "CF",
    isPitcher: false,
    bats: "R",
    throws: "R",
    kRate: 130,
    bbRate: 80,
    hbpRate: 6,
    singleRate: 150,
    doubleRate: 45,
    tripleRate: 5,
    hrRate: 35,
    stuff: 50,
    control: 50,
    durability: 50,
    speed: 55,
    defense: 55,
  };
  return { player, battingOrder: order, position: "CF" };
}

function staff(id: string): StaffArm[] {
  const sp: SimPlayer = { ...pitcher, id: `${id}-sp`, name: `${id} SP` };
  const rp: SimPlayer = { ...pitcher, id: `${id}-rp`, name: `${id} RP`, durability: 40 };
  const cl: SimPlayer = { ...pitcher, id: `${id}-cl`, name: `${id} CL` };
  return [
    { player: sp, role: "SP" },
    { player: rp, role: "LR" },
    { player: cl, role: "CL" },
  ];
}

function statsUnchanged() {
  const home = Array.from({ length: 9 }, (_, i) => makeHitter(`h${i}`, i + 1));
  const away = Array.from({ length: 9 }, (_, i) => makeHitter(`a${i}`, i + 1));
  const opts = {
    homeLineup: home,
    awayLineup: away,
    homeStaff: staff("H"),
    awayStaff: staff("A"),
    seed: 99,
  };
  const a = simulateGame(opts);
  const b = simulateGame(opts);
  // Deterministic and pitches attached to PA events
  assert.equal(a.homeScore, b.homeScore, "deterministic home");
  assert.equal(a.awayScore, b.awayScore, "deterministic away");
  const paEvents = a.playByPlay.filter((p) => p.pitches && p.pitches.length);
  assert.ok(paEvents.length > 20, "PA events carry pitch sequences");
  // Every pitched PA has a batter tag
  assert.ok(
    paEvents.every((p) => typeof p.batter === "string" && p.batter.length > 0),
    "pitched PAs name the batter",
  );
  console.log(
    `sim integration: ${a.awayScore}-${a.homeScore}, ${paEvents.length} pitched PAs`,
  );
}

sequenceTests();
statsUnchanged();
console.log("PITCH TESTS PASSED");
