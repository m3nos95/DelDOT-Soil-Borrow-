/**
 * Strategic snake-draft picks — build a real roster, not random BPA.
 *
 * Priority stack:
 *  1. Starting lineup holes (C, SS, CF, etc.)
 *  2. Five-man rotation, then bullpen
 *  3. Best available value under a round-aware budget
 *  4. Always leave cap room to finish the draft
 */
import {
  canAffordDraftPick,
  maxAffordableBid,
  MIN_HITTERS_FOR_LINEUP,
  MIN_PITCHERS_FOR_STAFF,
  MIN_PLAYER_SALARY,
} from "./cap";
import { pitcherRole } from "./staff";

export type DraftCand = {
  id: string;
  name: string;
  isPitcher: boolean;
  salary: number;
  careerWAR: number;
  durability: number;
  description: string;
  primaryPos: string;
  positions: string;
  stuff?: number;
};

type HitSlot = "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH";

const LINEUP_SLOTS: HitSlot[] = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
];

function bagOf(p: DraftCand): Set<string> {
  return new Set(
    [p.primaryPos, ...p.positions.split(",")]
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean),
  );
}

export function hitterSlot(p: DraftCand): HitSlot {
  if (p.isPitcher) return "DH";
  const bag = bagOf(p);
  for (const s of ["C", "SS", "CF", "2B", "3B", "1B", "LF", "RF"] as HitSlot[]) {
    if (bag.has(s) || p.primaryPos.toUpperCase() === s) return s;
  }
  if (["LF", "CF", "RF", "OF"].some((x) => bag.has(x))) {
    if (bag.has("CF")) return "CF";
    if (bag.has("LF")) return "LF";
    if (bag.has("RF")) return "RF";
    return "CF";
  }
  return "DH";
}

function canCover(p: DraftCand, slot: HitSlot): boolean {
  if (p.isPitcher) return false;
  if (slot === "DH") return true;
  const bag = bagOf(p);
  if (slot === "LF" || slot === "CF" || slot === "RF") {
    return bag.has(slot) || bag.has("OF") || p.primaryPos.toUpperCase() === "OF";
  }
  return bag.has(slot) || p.primaryPos.toUpperCase() === slot;
}

/** True OF bat — data often stamps every outfielder as CF + LF,CF,RF. */
export function isOutfielder(p: DraftCand): boolean {
  if (p.isPitcher) return false;
  const bag = bagOf(p);
  const prim = p.primaryPos.toUpperCase();
  return (
    prim === "LF" ||
    prim === "CF" ||
    prim === "RF" ||
    prim === "OF" ||
    bag.has("LF") ||
    bag.has("CF") ||
    bag.has("RF") ||
    bag.has("OF")
  );
}

/**
 * Assign OF bodies to CF → LF → RF so a club with three outfielders
 * counts as a full OF even when primaryPos is uniformly "CF".
 */
export function assignedOfSlots(roster: DraftCand[]): Map<HitSlot, DraftCand> {
  const ofs = roster
    .filter(isOutfielder)
    .sort(
      (a, b) =>
        b.careerWAR - a.careerWAR || a.salary - b.salary || a.name.localeCompare(b.name),
    );
  const out = new Map<HitSlot, DraftCand>();
  const order: HitSlot[] = ["CF", "LF", "RF"];
  for (let i = 0; i < order.length && i < ofs.length; i++) {
    out.set(order[i], ofs[i]);
  }
  return out;
}

function countDedicated(roster: DraftCand[], slot: HitSlot) {
  if (slot === "LF" || slot === "CF" || slot === "RF") {
    return assignedOfSlots(roster).has(slot) ? 1 : 0;
  }
  return roster.filter((p) => !p.isPitcher && hitterSlot(p) === slot).length;
}

function armKind(p: DraftCand): "SP" | "RP" {
  return pitcherRole(p);
}

/** Soft salary ceiling by how many picks this team already made. */
export function roundBudget(picksMade: number, maxBid: number): number {
  let soft: number;
  if (picksMade <= 1) soft = 32_000_000; // chase a true star / ace
  else if (picksMade <= 3) soft = 22_000_000;
  else if (picksMade <= 6) soft = 14_000_000;
  else if (picksMade <= 10) soft = 9_000_000;
  else if (picksMade <= 14) soft = 5_000_000;
  else soft = 2_500_000; // late filler / pen
  return Math.max(MIN_PLAYER_SALARY, Math.min(maxBid, soft));
}

type Need = { kind: "HIT" | "SP" | "RP"; slot?: HitSlot; weight: number; label: string };

function rosterNeeds(roster: DraftCand[]): Need[] {
  const hitters = roster.filter((p) => !p.isPitcher);
  const arms = roster.filter((p) => p.isPitcher);
  const sps = arms.filter((p) => armKind(p) === "SP");
  const rps = arms.filter((p) => armKind(p) === "RP");
  const needs: Need[] = [];

  for (const slot of LINEUP_SLOTS) {
    if (slot === "DH") continue;
    const n = countDedicated(hitters, slot);
    const scarce = slot === "C" || slot === "SS" || slot === "CF";
    if (n === 0) {
      needs.push({
        kind: "HIT",
        slot,
        weight: scarce ? 3.2 : 2.6,
        label: `need ${slot}`,
      });
    } else if (n === 1 && scarce) {
      needs.push({
        kind: "HIT",
        slot,
        weight: 1.35,
        label: `depth ${slot}`,
      });
    }
  }

  const ofCount = hitters.filter(isOutfielder).length;
  if (ofCount < 3) {
    const nextOf: HitSlot = ofCount === 0 ? "CF" : ofCount === 1 ? "LF" : "RF";
    needs.push({
      kind: "HIT",
      slot: nextOf,
      weight: 2.5,
      label: `need OF`,
    });
  }

  if (sps.length < 5) {
    needs.push({
      kind: "SP",
      weight: 2.4 + (5 - sps.length) * 0.35,
      label: `SP ${sps.length}/5`,
    });
  }
  if (rps.length < 3) {
    const base =
      sps.length >= 5 ? 3.15 : sps.length >= 3 ? 2.25 : 1.45;
    needs.push({
      kind: "RP",
      weight: base + (3 - rps.length) * 0.4,
      label: `RP ${rps.length}/3`,
    });
  }

  if (hitters.length < MIN_HITTERS_FOR_LINEUP) {
    needs.push({
      kind: "HIT",
      weight: 2.8,
      label: `hitters ${hitters.length}/${MIN_HITTERS_FOR_LINEUP}`,
    });
  }
  if (arms.length < MIN_PITCHERS_FOR_STAFF) {
    needs.push({
      kind: sps.length < 5 ? "SP" : "RP",
      weight: Math.max(2.5, 3.5 - arms.length * 0.2),
      label: `arms ${arms.length}/${MIN_PITCHERS_FOR_STAFF}`,
    });
  }

  return needs.sort((a, b) => b.weight - a.weight);
}

function fitsNeed(p: DraftCand, need: Need): boolean {
  if (need.kind === "SP") return p.isPitcher && armKind(p) === "SP";
  if (need.kind === "RP") return p.isPitcher && armKind(p) === "RP";
  if (p.isPitcher) return false;
  if (!need.slot) return true;
  if (need.label === "need OF" || need.label.startsWith("hitters")) {
    return need.label === "need OF" ? isOutfielder(p) : true;
  }
  if (need.slot === "LF" || need.slot === "CF" || need.slot === "RF") {
    return isOutfielder(p);
  }
  // Infield/C holes want a true positional fit
  if (need.label.startsWith("need ")) {
    return hitterSlot(p) === need.slot;
  }
  return canCover(p, need.slot);
}

function warPerMill(p: DraftCand) {
  return p.careerWAR / Math.max(0.5, p.salary / 1_000_000);
}

/**
 * Score a candidate for this roster state.
 * Higher = better pick right now.
 */
export function scoreDraftCandidate(
  p: DraftCand,
  roster: DraftCand[],
  needs: Need[],
  picksMade: number,
  seed: number,
): number {
  const topNeed = needs[0];
  const matchTop = topNeed && fitsNeed(p, topNeed) ? topNeed.weight : 0;
  let matchAny = 0;
  for (const n of needs.slice(0, 4)) {
    if (fitsNeed(p, n)) matchAny = Math.max(matchAny, n.weight * 0.55);
  }

  // Scarce up-the-middle bats get a bump early
  const slot = hitterSlot(p);
  const upMiddle =
    !p.isPitcher && (slot === "C" || slot === "SS" || slot === "CF") ? 1.25 : 1;

  // Ace SP early
  const ace =
    p.isPitcher && armKind(p) === "SP" && p.careerWAR >= 40 && picksMade <= 3
      ? 1.35
      : 1;

  const value = warPerMill(p);
  const war = Math.max(0, p.careerWAR);
  const jitter = ((p.name.charCodeAt(0) + seed * 13) % 11) * 0.02;

  // Blend: need fit + raw talent + salary efficiency
  return (
    war * 1.15 * upMiddle * ace +
    matchTop * 14 +
    matchAny * 8 +
    value * 3.5 +
    jitter
  );
}

export function selectStrategicPick(opts: {
  roster: DraftCand[];
  pool: DraftCand[];
  taken: Set<string>;
  payroll: number;
  salaryCap: number;
  draftRounds: number;
  seed?: number;
}): DraftCand | null {
  const {
    roster,
    pool,
    taken,
    payroll,
    salaryCap,
    draftRounds,
    seed = 1,
  } = opts;

  if (roster.length >= draftRounds || roster.length >= 25) return null;

  const hitters = roster.filter((p) => !p.isPitcher).length;
  const pitchers = roster.filter((p) => p.isPitcher).length;
  const maxBid = maxAffordableBid(
    payroll,
    salaryCap,
    roster.length,
    draftRounds,
  );
  const budget = roundBudget(roster.length, maxBid);
  const needs = rosterNeeds(roster);

  const eligible = pool.filter((p) => {
    if (taken.has(p.id)) return false;
    if (!p.isPitcher && hitters >= 14) return false;
    if (p.isPitcher && pitchers >= 11) return false;
    return canAffordDraftPick({
      payroll,
      salaryCap,
      rosterLen: roster.length,
      draftRounds,
      pickSalary: p.salary,
      hitters,
      pitchers,
      pickingPitcher: p.isPitcher,
    }).ok;
  });

  if (!eligible.length) return null;

  // Soft budget steers value; urgent roster holes may spend up to maxBid.
  const urgent = needs.find((n) => n.weight >= 2.2);
  const inBudget = eligible.filter((p) => p.salary <= budget);

  let focused = inBudget.length ? inBudget : eligible;
  if (urgent) {
    const matched = eligible.filter((p) => fitsNeed(p, urgent));
    if (matched.length) {
      const cheapMatched = matched.filter((p) => p.salary <= budget);
      focused = cheapMatched.length ? cheapMatched : matched;
    }
  }

  focused.sort(
    (a, b) =>
      scoreDraftCandidate(b, roster, needs, roster.length, seed) -
      scoreDraftCandidate(a, roster, needs, roster.length, seed),
  );

  if (focused[0]) return focused[0];

  // Absolute fallback: cheapest legal player so we never burn a pick
  return (
    [...eligible].sort(
      (a, b) => a.salary - b.salary || b.careerWAR - a.careerWAR,
    )[0] ?? null
  );
}
