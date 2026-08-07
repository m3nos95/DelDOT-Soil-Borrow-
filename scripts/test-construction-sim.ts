/**
 * Prove the sim rewards construction:
 * 1) Lefty stack vs Randy Johnson gets crushed vs same stack vs soft RHP
 * 2) Short SP + bad pen bleeds late vs short SP + elite pen
 * 3) Rickey + three K guys scores less than Rickey + contact table-setters
 */
import {
  simulateGame,
  platoonOffenseFactor,
  type LineupEntry,
  type SimPlayer,
  type StaffArm,
} from "../src/lib/sim";

function bat(
  id: string,
  name: string,
  bats: "L" | "R" | "S",
  rates: Partial<SimPlayer> & {
    kRate: number;
    bbRate: number;
    singleRate: number;
    doubleRate: number;
    tripleRate: number;
    hrRate: number;
  },
): SimPlayer {
  return {
    id,
    name,
    primaryPos: "OF",
    isPitcher: false,
    bats,
    throws: "R",
    hbpRate: 5,
    stuff: 50,
    control: 50,
    durability: 50,
    speed: rates.speed ?? 50,
    ...rates,
  };
}

function pit(
  id: string,
  name: string,
  throws: "L" | "R",
  stuff: number,
  control: number,
  durability: number,
): SimPlayer {
  return {
    id,
    name,
    primaryPos: "P",
    isPitcher: true,
    bats: "R",
    throws,
    kRate: 200,
    bbRate: 70,
    hbpRate: 5,
    singleRate: 140,
    doubleRate: 30,
    tripleRate: 2,
    hrRate: 20,
    stuff,
    control,
    durability,
    speed: 30,
  };
}

function lineup(players: SimPlayer[]): LineupEntry[] {
  return players.map((player, i) => ({
    player,
    battingOrder: i + 1,
    position: "DH",
  }));
}

function avgRuns(
  n: number,
  build: (seed: number) => ReturnType<typeof simulateGame>,
  side: "home" | "away",
) {
  let runs = 0;
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const g = build(1000 + i * 17);
    runs += side === "home" ? g.homeScore : g.awayScore;
    if (side === "home" ? g.homeScore > g.awayScore : g.awayScore > g.homeScore) {
      wins += 1;
    }
  }
  return { rpg: runs / n, winPct: wins / n };
}

const unit = pit("rj", "Randy Johnson", "L", 97, 72, 85);
const softRighty = pit("soft", "Soft Toss Righty", "R", 55, 70, 80);

const leftyStack = lineup([
  bat("l1", "Lefty 1", "L", {
    kRate: 140,
    bbRate: 100,
    singleRate: 160,
    doubleRate: 45,
    tripleRate: 5,
    hrRate: 45,
    speed: 55,
  }),
  bat("l2", "Lefty 2", "L", {
    kRate: 150,
    bbRate: 90,
    singleRate: 155,
    doubleRate: 40,
    tripleRate: 4,
    hrRate: 50,
    speed: 50,
  }),
  bat("l3", "Lefty 3", "L", {
    kRate: 160,
    bbRate: 95,
    singleRate: 150,
    doubleRate: 42,
    tripleRate: 3,
    hrRate: 55,
    speed: 48,
  }),
  bat("l4", "Lefty 4", "L", {
    kRate: 170,
    bbRate: 100,
    singleRate: 145,
    doubleRate: 40,
    tripleRate: 3,
    hrRate: 60,
    speed: 45,
  }),
  bat("l5", "Lefty 5", "L", {
    kRate: 150,
    bbRate: 85,
    singleRate: 155,
    doubleRate: 38,
    tripleRate: 4,
    hrRate: 40,
    speed: 50,
  }),
  bat("l6", "Lefty 6", "L", {
    kRate: 140,
    bbRate: 80,
    singleRate: 160,
    doubleRate: 35,
    tripleRate: 5,
    hrRate: 35,
    speed: 52,
  }),
  bat("l7", "Lefty 7", "L", {
    kRate: 155,
    bbRate: 75,
    singleRate: 150,
    doubleRate: 35,
    tripleRate: 3,
    hrRate: 38,
    speed: 50,
  }),
  bat("l8", "Lefty 8", "L", {
    kRate: 145,
    bbRate: 70,
    singleRate: 155,
    doubleRate: 32,
    tripleRate: 3,
    hrRate: 30,
    speed: 48,
  }),
  bat("l9", "Lefty 9", "L", {
    kRate: 160,
    bbRate: 65,
    singleRate: 150,
    doubleRate: 30,
    tripleRate: 2,
    hrRate: 28,
    speed: 45,
  }),
]);

const dummyLineup = lineup(
  Array.from({ length: 9 }, (_, i) =>
    bat(`d${i}`, `Dummy ${i}`, "R", {
      kRate: 180,
      bbRate: 60,
      singleRate: 140,
      doubleRate: 30,
      tripleRate: 2,
      hrRate: 25,
      speed: 45,
    }),
  ),
);

console.log(
  "Platoon factor Lefty vs Unit:",
  platoonOffenseFactor(leftyStack[0].player, unit).toFixed(3),
);
console.log(
  "Platoon factor Lefty vs soft RHP:",
  platoonOffenseFactor(leftyStack[0].player, softRighty).toFixed(3),
);

const n = 80;
const vsUnit = avgRuns(
  n,
  (seed) =>
    simulateGame({
      awayLineup: leftyStack,
      homeLineup: dummyLineup,
      awayStaff: [{ player: softRighty, role: "SP" }],
      homeStaff: [
        { player: unit, role: "SP" },
        { player: pit("cl1", "Unit CL", "R", 85, 80, 60), role: "CL" },
        { player: pit("su1", "Unit SU", "R", 80, 78, 60), role: "SU" },
      ],
      seed,
    }),
  "away",
);
const vsSoft = avgRuns(
  n,
  (seed) =>
    simulateGame({
      awayLineup: leftyStack,
      homeLineup: dummyLineup,
      awayStaff: [{ player: softRighty, role: "SP" }],
      homeStaff: [
        { player: softRighty, role: "SP" },
        { player: pit("cl2", "Soft CL", "R", 70, 75, 60), role: "CL" },
      ],
      seed,
    }),
  "away",
);

console.log(
  `Lefty stack RPG vs Unit: ${vsUnit.rpg.toFixed(2)} | vs soft RHP: ${vsSoft.rpg.toFixed(2)}`,
);

// Bullpen test: glass SP
const glassSp = pit("glass", "Glass SP", "R", 88, 80, 25);
const elitePen: StaffArm[] = [
  { player: glassSp, role: "SP" },
  { player: pit("elr", "Elite LR", "R", 82, 85, 70), role: "LR" },
  { player: pit("esu", "Elite SU", "R", 90, 88, 60), role: "SU" },
  { player: pit("ecl", "Elite CL", "R", 95, 90, 55), role: "CL" },
];
const junkPen: StaffArm[] = [
  { player: glassSp, role: "SP" },
  { player: pit("j1", "Junk RP1", "R", 45, 50, 50), role: "LR" },
  { player: pit("j2", "Junk RP2", "R", 48, 52, 50), role: "SU" },
  { player: pit("j3", "Junk RP3", "R", 50, 55, 50), role: "CL" },
];

const offense = lineup([
  bat("o1", "Table 1", "R", {
    kRate: 120,
    bbRate: 90,
    singleRate: 170,
    doubleRate: 40,
    tripleRate: 5,
    hrRate: 35,
    speed: 60,
  }),
  bat("o2", "Table 2", "L", {
    kRate: 130,
    bbRate: 95,
    singleRate: 165,
    doubleRate: 42,
    tripleRate: 4,
    hrRate: 40,
    speed: 55,
  }),
  bat("o3", "Table 3", "R", {
    kRate: 140,
    bbRate: 100,
    singleRate: 160,
    doubleRate: 45,
    tripleRate: 3,
    hrRate: 50,
    speed: 50,
  }),
  bat("o4", "Table 4", "L", {
    kRate: 150,
    bbRate: 90,
    singleRate: 155,
    doubleRate: 40,
    tripleRate: 3,
    hrRate: 55,
    speed: 48,
  }),
  bat("o5", "Table 5", "R", {
    kRate: 145,
    bbRate: 85,
    singleRate: 158,
    doubleRate: 38,
    tripleRate: 3,
    hrRate: 45,
    speed: 50,
  }),
  bat("o6", "Table 6", "R", {
    kRate: 140,
    bbRate: 80,
    singleRate: 160,
    doubleRate: 35,
    tripleRate: 4,
    hrRate: 35,
    speed: 52,
  }),
  bat("o7", "Table 7", "L", {
    kRate: 135,
    bbRate: 75,
    singleRate: 162,
    doubleRate: 34,
    tripleRate: 4,
    hrRate: 32,
    speed: 55,
  }),
  bat("o8", "Table 8", "R", {
    kRate: 150,
    bbRate: 70,
    singleRate: 155,
    doubleRate: 32,
    tripleRate: 3,
    hrRate: 30,
    speed: 48,
  }),
  bat("o9", "Table 9", "R", {
    kRate: 160,
    bbRate: 65,
    singleRate: 150,
    doubleRate: 30,
    tripleRate: 2,
    hrRate: 28,
    speed: 45,
  }),
]);

const elite = avgRuns(
  n,
  (seed) =>
    simulateGame({
      homeLineup: offense,
      awayLineup: offense,
      homeStaff: elitePen,
      awayStaff: [
        { player: pit("opp", "Opp SP", "R", 80, 78, 75), role: "SP" },
        { player: pit("oppcl", "Opp CL", "R", 85, 80, 60), role: "CL" },
      ],
      seed,
    }),
  "home",
);
const junk = avgRuns(
  n,
  (seed) =>
    simulateGame({
      homeLineup: offense,
      awayLineup: offense,
      homeStaff: junkPen,
      awayStaff: [
        { player: pit("opp2", "Opp SP2", "R", 80, 78, 75), role: "SP" },
        { player: pit("oppcl2", "Opp CL2", "R", 85, 80, 60), role: "CL" },
      ],
      seed,
    }),
  "home",
);

console.log(
  `Glass SP win% with elite pen: ${(elite.winPct * 100).toFixed(0)}% | junk pen: ${(junk.winPct * 100).toFixed(0)}%`,
);
console.log(
  `RA with elite pen: ${elite.rpg.toFixed(2)} allowed-as-home-RPG proxy via home scoring env — home RPG elite ${elite.rpg.toFixed(2)} junk ${junk.rpg.toFixed(2)}`,
);

// Actually compare runs ALLOWED — re-sim tracking away scores against each pen
function avgAllowed(staff: StaffArm[]) {
  let ra = 0;
  let lateRa = 0;
  for (let i = 0; i < n; i++) {
    const g = simulateGame({
      homeLineup: offense,
      awayLineup: offense,
      homeStaff: staff,
      awayStaff: [
        { player: pit(`osp${i}`, "Opp", "R", 80, 78, 75), role: "SP" },
        { player: pit(`ocl${i}`, "OppCL", "R", 85, 80, 60), role: "CL" },
      ],
      seed: 5000 + i * 13,
    });
    ra += g.awayScore;
    // late = innings after 6 (approx from inningScores pairs)
    const halves = g.innings;
    // top halves are away: indices 0,2,4...
    for (let h = 0; h < halves.length; h += 2) {
      const inningNum = h / 2 + 1;
      if (inningNum >= 7) lateRa += halves[h];
    }
  }
  return { ra: ra / n, lateRa: lateRa / n };
}

const eliteA = avgAllowed(elitePen);
const junkA = avgAllowed(junkPen);
console.log(
  `Runs allowed — elite pen ${eliteA.ra.toFixed(2)} (late ${eliteA.lateRa.toFixed(2)}) | junk pen ${junkA.ra.toFixed(2)} (late ${junkA.lateRa.toFixed(2)})`,
);

// Sequencing: Rickey + Ks vs Rickey + contact
const rickey = bat("rickey", "Rickey Henderson", "R", {
  kRate: 140,
  bbRate: 170,
  singleRate: 165,
  doubleRate: 30,
  tripleRate: 10,
  hrRate: 25,
  speed: 95,
});
// Empty K machines (not 3-true-outcome mashers) — they strand runners
const kGuy = (id: string) =>
  bat(id, id, "R", {
    kRate: 320,
    bbRate: 55,
    singleRate: 105,
    doubleRate: 18,
    tripleRate: 1,
    hrRate: 12,
    speed: 35,
  });
const contact = (id: string) =>
  bat(id, id, "L", {
    kRate: 80,
    bbRate: 90,
    singleRate: 200,
    doubleRate: 40,
    tripleRate: 6,
    hrRate: 20,
    speed: 60,
  });

const kLineup = lineup([
  rickey,
  kGuy("k2"),
  kGuy("k3"),
  kGuy("k4"),
  contact("c5"),
  contact("c6"),
  contact("c7"),
  contact("c8"),
  contact("c9"),
]);
const contactLineup = lineup([
  rickey,
  contact("c2"),
  contact("c3"),
  contact("c4"),
  contact("c5b"),
  contact("c6b"),
  kGuy("k7"),
  kGuy("k8"),
  kGuy("k9"),
]);

function sequencing(lu: LineupEntry[]) {
  let teamRuns = 0;
  let rickeyRuns = 0;
  let rickeyOn = 0;
  for (let i = 0; i < n; i++) {
    const g = simulateGame({
      awayLineup: lu,
      homeLineup: dummyLineup,
      awayStaff: [{ player: softRighty, role: "SP" }],
      homeStaff: [
        { player: softRighty, role: "SP" },
        { player: pit("x", "X", "R", 75, 75, 60), role: "CL" },
      ],
      seed: 9000 + i * 11,
    });
    teamRuns += g.awayScore;
    const box = g.awayBox.batters.find((b) => b.name === "Rickey Henderson")!;
    rickeyRuns += box.r;
    rickeyOn += box.h + box.bb;
  }
  return {
    teamRpg: teamRuns / n,
    rickeyRpg: rickeyRuns / n,
    scoreRate: rickeyOn ? rickeyRuns / rickeyOn : 0,
  };
}

const kSeq = sequencing(kLineup);
const cSeq = sequencing(contactLineup);
console.log(
  `Team RPG — Ks behind Rickey: ${kSeq.teamRpg.toFixed(2)} | contact behind: ${cSeq.teamRpg.toFixed(2)}`,
);
console.log(
  `Rickey score% when on — Ks behind: ${(kSeq.scoreRate * 100).toFixed(1)}% | contact: ${(cSeq.scoreRate * 100).toFixed(1)}%`,
);

const checks = {
  platoon: vsUnit.rpg < vsSoft.rpg * 0.85,
  bullpenRa: eliteA.ra < junkA.ra,
  bullpenLate: eliteA.lateRa < junkA.lateRa,
  rickeyScoreRate: cSeq.scoreRate > kSeq.scoreRate + 0.05,
};
const ok = Object.values(checks).every(Boolean);

console.log("checks", checks);
console.log(ok ? "CONSTRUCTION TESTS PASSED" : "CONSTRUCTION TESTS WEAK/FAIL");
if (!ok) process.exit(1);
