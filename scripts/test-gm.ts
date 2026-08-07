import {
  assessNeeds,
  evaluateTradeForTeam,
  findMutualTrade,
  playerValue,
  type GmPlayer,
} from "../src/lib/gm";

function p(
  partial: Partial<GmPlayer> & Pick<GmPlayer, "id" | "name" | "primaryPos">,
): GmPlayer {
  return {
    positions: partial.positions ?? partial.primaryPos,
    isPitcher: partial.isPitcher ?? false,
    salary: partial.salary ?? 5_000_000,
    careerWAR: partial.careerWAR ?? 10,
    stuff: 50,
    durability: 50,
    ...partial,
  };
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// Needs: missing catcher is urgent
const thin = [
  p({ id: "1", name: "1B", primaryPos: "1B", careerWAR: 20 }),
  p({ id: "2", name: "SS", primaryPos: "SS", careerWAR: 18 }),
  p({ id: "3", name: "OF1", primaryPos: "CF", careerWAR: 22 }),
  p({ id: "4", name: "SP", primaryPos: "SP", isPitcher: true, careerWAR: 30, durability: 70 }),
];
const needs = assessNeeds(thin);
assert(
  needs.some((n) => n.slot === "C" && n.urgency >= 0.9),
  "Should need a catcher",
);

// Reject one-sided star dump
const roster = [
  p({ id: "s", name: "Star", primaryPos: "CF", careerWAR: 80, salary: 30_000_000 }),
  p({ id: "b", name: "Bench", primaryPos: "C", careerWAR: 8 }),
  p({ id: "sp1", name: "Ace", primaryPos: "SP", isPitcher: true, careerWAR: 40, durability: 80 }),
  p({ id: "sp2", name: "SP2", primaryPos: "SP", isPitcher: true, careerWAR: 20, durability: 70 }),
  p({ id: "sp3", name: "SP3", primaryPos: "SP", isPitcher: true, careerWAR: 15, durability: 65 }),
  p({ id: "sp4", name: "SP4", primaryPos: "SP", isPitcher: true, careerWAR: 12, durability: 60 }),
  p({ id: "rp1", name: "CL", primaryPos: "CL", isPitcher: true, careerWAR: 15 }),
  p({ id: "rp2", name: "SU", primaryPos: "RP", isPitcher: true, careerWAR: 8 }),
  p({ id: "h2", name: "2B", primaryPos: "2B", careerWAR: 25 }),
  p({ id: "h3", name: "3B", primaryPos: "3B", careerWAR: 22 }),
  p({ id: "h4", name: "SS", primaryPos: "SS", careerWAR: 28 }),
  p({ id: "h5", name: "1B", primaryPos: "1B", careerWAR: 18 }),
  p({ id: "h6", name: "LF", primaryPos: "LF", careerWAR: 16 }),
  p({ id: "h7", name: "RF", primaryPos: "RF", careerWAR: 14 }),
  p({ id: "h8", name: "DH", primaryPos: "DH", careerWAR: 12 }),
];
const junk = p({
  id: "j",
  name: "Junk",
  primaryPos: "DH",
  careerWAR: 2,
  salary: 500_000,
});
const dump = evaluateTradeForTeam({
  roster,
  give: [roster[0]],
  get: [junk],
  salaryCap: 120_000_000,
  currentPayroll: roster.reduce((s, x) => s + x.salary, 0),
});
assert(!dump.accept, `Should reject star dump: ${dump.reason}`);

// Accept fair need-filling swap
const weakC = [
  ...roster.filter((x) => x.id !== "b"),
  p({ id: "wc", name: "WeakC", primaryPos: "C", careerWAR: 3 }),
];
const goodC = p({
  id: "gc",
  name: "GoodC",
  primaryPos: "C",
  careerWAR: 35,
  salary: 12_000_000,
});
const surplusOF = p({
  id: "sof",
  name: "ExtraOF",
  primaryPos: "LF",
  careerWAR: 30,
  salary: 11_000_000,
});
const fair = evaluateTradeForTeam({
  roster: weakC,
  give: [surplusOF],
  get: [goodC],
  salaryCap: 120_000_000,
  currentPayroll: weakC.reduce((s, x) => s + x.salary, 0) + surplusOF.salary,
});
assert(fair.accept, `Should accept fair C upgrade: ${fair.reason}`);

// Mutual finder: A needs C, has OF depth; B has C depth, thin OF
const teamA = [
  p({ id: "a-c", name: "AWeakC", primaryPos: "C", careerWAR: 4 }),
  p({ id: "a-1b", name: "A1B", primaryPos: "1B", careerWAR: 20 }),
  p({ id: "a-2b", name: "A2B", primaryPos: "2B", careerWAR: 18 }),
  p({ id: "a-3b", name: "A3B", primaryPos: "3B", careerWAR: 17 }),
  p({ id: "a-ss", name: "ASS", primaryPos: "SS", careerWAR: 19 }),
  p({ id: "a-cf", name: "ACF", primaryPos: "CF", careerWAR: 35, salary: 14_000_000 }),
  p({ id: "a-lf", name: "ALF", primaryPos: "LF", careerWAR: 32, salary: 12_000_000 }),
  p({ id: "a-rf", name: "ARF", primaryPos: "RF", careerWAR: 28, salary: 11_000_000 }),
  p({ id: "a-dh", name: "ADH", primaryPos: "DH", careerWAR: 12 }),
  p({ id: "a-sp1", name: "ASP1", primaryPos: "SP", isPitcher: true, careerWAR: 30, durability: 75 }),
  p({ id: "a-sp2", name: "ASP2", primaryPos: "SP", isPitcher: true, careerWAR: 20, durability: 70 }),
  p({ id: "a-sp3", name: "ASP3", primaryPos: "SP", isPitcher: true, careerWAR: 16, durability: 65 }),
  p({ id: "a-sp4", name: "ASP4", primaryPos: "SP", isPitcher: true, careerWAR: 12, durability: 60 }),
  p({ id: "a-rp1", name: "ARP1", primaryPos: "CL", isPitcher: true, careerWAR: 14 }),
  p({ id: "a-rp2", name: "ARP2", primaryPos: "RP", isPitcher: true, careerWAR: 8 }),
];
const teamB = [
  p({ id: "b-c1", name: "BGoodC", primaryPos: "C", careerWAR: 36, salary: 13_000_000 }),
  p({ id: "b-c2", name: "BBackupC", primaryPos: "C", careerWAR: 18, salary: 6_000_000 }),
  p({ id: "b-1b", name: "B1B", primaryPos: "1B", careerWAR: 20 }),
  p({ id: "b-2b", name: "B2B", primaryPos: "2B", careerWAR: 18 }),
  p({ id: "b-3b", name: "B3B", primaryPos: "3B", careerWAR: 16 }),
  p({ id: "b-ss", name: "BSS", primaryPos: "SS", careerWAR: 15 }),
  p({ id: "b-cf", name: "BWeakCF", primaryPos: "CF", careerWAR: 6 }),
  p({ id: "b-lf", name: "BWeakLF", primaryPos: "LF", careerWAR: 5 }),
  p({ id: "b-dh", name: "BDH", primaryPos: "DH", careerWAR: 8 }),
  p({ id: "b-sp1", name: "BSP1", primaryPos: "SP", isPitcher: true, careerWAR: 25, durability: 70 }),
  p({ id: "b-sp2", name: "BSP2", primaryPos: "SP", isPitcher: true, careerWAR: 18, durability: 65 }),
  p({ id: "b-sp3", name: "BSP3", primaryPos: "SP", isPitcher: true, careerWAR: 14, durability: 60 }),
  p({ id: "b-sp4", name: "BSP4", primaryPos: "SP", isPitcher: true, careerWAR: 11, durability: 55 }),
  p({ id: "b-rp1", name: "BRP1", primaryPos: "CL", isPitcher: true, careerWAR: 12 }),
  p({ id: "b-rp2", name: "BRP2", primaryPos: "RP", isPitcher: true, careerWAR: 7 }),
];
const mutual = findMutualTrade({
  aRoster: teamA,
  bRoster: teamB,
  aPayroll: teamA.reduce((s, x) => s + x.salary, 0),
  bPayroll: teamB.reduce((s, x) => s + x.salary, 0),
  salaryCap: 120_000_000,
});
assert(mutual, "Expected a mutual trade");
assert(mutual!.aGive.length && mutual!.bGive.length, "Both sides move players");

assert(playerValue(roster[0]) > playerValue(junk) * 5, "Star worth much more");

console.log("GM OK", {
  dump: dump.reason,
  fair: fair.reason,
  mutual: mutual?.reason,
});
