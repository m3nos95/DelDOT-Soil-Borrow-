/**
 * Front-office helpers: roster needs, player value, trade fairness, FA targeting.
 * Pure evaluation where possible so CPU and human flows share the same rules.
 */

export type GmPlayer = {
  id: string;
  name: string;
  primaryPos: string;
  positions: string;
  isPitcher: boolean;
  salary: number;
  careerWAR: number;
  stuff?: number;
  durability?: number;
};

export type NeedSlot =
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "OF"
  | "DH"
  | "SP"
  | "RP";

export type RosterNeed = {
  slot: NeedSlot;
  urgency: number; // 0–1
  reason: string;
};

const HIT_SLOTS: NeedSlot[] = ["C", "1B", "2B", "3B", "SS", "OF", "DH"];

export function normalizeSlot(p: GmPlayer): NeedSlot {
  if (p.isPitcher) {
    const pos = `${p.primaryPos},${p.positions}`.toUpperCase();
    if (/\b(CL|RP|SU|MR)\b/.test(pos)) return "RP";
    // High durability / SP label → starter; otherwise pen
    if (/\bSP\b/.test(pos) || (p.durability ?? 50) >= 55) return "SP";
    return "RP";
  }
  const pos = p.primaryPos.toUpperCase();
  if (pos === "C") return "C";
  if (pos === "1B") return "1B";
  if (pos === "2B") return "2B";
  if (pos === "3B") return "3B";
  if (pos === "SS") return "SS";
  if (pos === "DH") return "DH";
  if (["LF", "CF", "RF", "OF"].includes(pos)) return "OF";
  const bag = p.positions.toUpperCase().split(",");
  for (const s of HIT_SLOTS) {
    if (s === "OF") {
      if (bag.some((x) => ["LF", "CF", "RF", "OF"].includes(x))) return "OF";
    } else if (bag.includes(s)) return s;
  }
  return "DH";
}

/** Relative trade chip value — WAR-weighted, soft salary bump for stars. */
export function playerValue(p: GmPlayer): number {
  const war = Math.max(0, p.careerWAR);
  const warPart = war * 10;
  const starBump = war >= 40 ? (war - 40) * 2 : 0;
  const salaryPart = p.salary / 8_000_000;
  return Math.max(1.5, warPart + starBump + salaryPart);
}

export function canPlaySlot(p: GmPlayer, slot: NeedSlot): boolean {
  if (normalizeSlot(p) === slot) return true;
  if (p.isPitcher) {
    return slot === "SP" || slot === "RP";
  }
  const bag = new Set(
    [p.primaryPos, ...p.positions.split(",")]
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean),
  );
  if (slot === "OF") {
    return ["LF", "CF", "RF", "OF"].some((x) => bag.has(x));
  }
  if (slot === "DH") return !p.isPitcher;
  return bag.has(slot);
}

function bestAt(
  roster: GmPlayer[],
  slot: NeedSlot,
): { player: GmPlayer; value: number } | null {
  let best: { player: GmPlayer; value: number } | null = null;
  for (const p of roster) {
    if (!canPlaySlot(p, slot)) continue;
    const v = playerValue(p);
    if (!best || v > best.value) best = { player: p, value: v };
  }
  return best;
}

function countAt(roster: GmPlayer[], slot: NeedSlot) {
  return roster.filter((p) => canPlaySlot(p, slot)).length;
}

/** Depth / quality gaps the GM should try to fill. */
export function assessNeeds(roster: GmPlayer[]): RosterNeed[] {
  const needs: RosterNeed[] = [];
  const hitters = roster.filter((p) => !p.isPitcher);
  const pitchers = roster.filter((p) => p.isPitcher);
  const sps = pitchers.filter((p) => normalizeSlot(p) === "SP");
  const rps = pitchers.filter((p) => normalizeSlot(p) === "RP");

  for (const slot of HIT_SLOTS) {
    if (slot === "DH") continue;
    const best = bestAt(hitters, slot);
    const depth = countAt(hitters, slot);
    const target = slot === "OF" ? 35 : 22; // soft WAR-ish via value/10
    const bestWar = best ? best.player.careerWAR : 0;
    if (!best) {
      needs.push({
        slot,
        urgency: 1,
        reason: `No ${slot}`,
      });
    } else if (bestWar < (slot === "OF" ? 8 : 12) || best.value < target) {
      needs.push({
        slot,
        urgency: Math.min(1, 0.55 + (20 - bestWar) / 40),
        reason: `Weak ${slot} (${best.player.name})`,
      });
    } else if (depth < (slot === "OF" ? 3 : 1)) {
      needs.push({
        slot,
        urgency: 0.35,
        reason: `Thin ${slot} depth`,
      });
    }
  }

  if (sps.length < 4) {
    needs.push({
      slot: "SP",
      urgency: Math.min(1, 0.5 + (4 - sps.length) * 0.2),
      reason: `Need starters (${sps.length}/5)`,
    });
  } else {
    const topSp = [...sps].sort((a, b) => b.careerWAR - a.careerWAR)[0];
    if (topSp && topSp.careerWAR < 15) {
      needs.push({
        slot: "SP",
        urgency: 0.55,
        reason: `Ace upgrade over ${topSp.name}`,
      });
    }
  }

  if (rps.length < 3) {
    needs.push({
      slot: "RP",
      urgency: Math.min(1, 0.4 + (3 - rps.length) * 0.2),
      reason: `Need pen arms (${rps.length})`,
    });
  }

  if (hitters.length < 10) {
    needs.push({
      slot: "DH",
      urgency: 0.9,
      reason: `Short on hitters (${hitters.length})`,
    });
  }
  if (pitchers.length < 6) {
    needs.push({
      slot: "SP",
      urgency: 1,
      reason: `Short on pitchers (${pitchers.length})`,
    });
  }

  return needs.sort((a, b) => b.urgency - a.urgency);
}

/** Surplus chips a team can deal without gutting a position. */
export function assessSurplus(roster: GmPlayer[]): GmPlayer[] {
  const bySlot = new Map<NeedSlot, GmPlayer[]>();
  for (const p of roster) {
    const slot = normalizeSlot(p);
    const list = bySlot.get(slot) ?? [];
    list.push(p);
    bySlot.set(slot, list);
  }
  const surplus: GmPlayer[] = [];
  for (const [slot, list] of bySlot) {
    const sorted = [...list].sort((a, b) => playerValue(b) - playerValue(a));
    const keep = slot === "OF" ? 3 : slot === "SP" ? 5 : slot === "RP" ? 3 : 1;
    surplus.push(...sorted.slice(keep));
  }
  return surplus.sort((a, b) => playerValue(b) - playerValue(a));
}

export function needMatchScore(player: GmPlayer, needs: RosterNeed[]): number {
  let score = 0;
  for (const n of needs) {
    if (!canPlaySlot(player, n.slot)) continue;
    score += n.urgency * (0.6 + Math.min(player.careerWAR, 60) / 80);
  }
  return score;
}

export type TradeEval = {
  accept: boolean;
  reason: string;
  fairness: number;
  needScore: number;
  giveValue: number;
  getValue: number;
};

/**
 * Evaluate a trade from `team`'s perspective (they give `give`, receive `get`).
 * Rejects one-sided dumps and deals that ignore roster construction.
 */
export function evaluateTradeForTeam(opts: {
  roster: GmPlayer[];
  give: GmPlayer[];
  get: GmPlayer[];
  salaryCap: number;
  currentPayroll: number;
}): TradeEval {
  const { roster, give, get, salaryCap, currentPayroll } = opts;
  const giveIds = new Set(give.map((p) => p.id));
  const giveValue = give.reduce((s, p) => s + playerValue(p), 0);
  const getValue = get.reduce((s, p) => s + playerValue(p), 0);
  const fairness = giveValue <= 0 ? 99 : getValue / giveValue;

  const payrollAfter =
    currentPayroll -
    give.reduce((s, p) => s + p.salary, 0) +
    get.reduce((s, p) => s + p.salary, 0);
  if (payrollAfter > salaryCap) {
    return {
      accept: false,
      reason: "Over the salary cap",
      fairness,
      needScore: 0,
      giveValue,
      getValue,
    };
  }

  const remaining = roster.filter((p) => !giveIds.has(p.id));
  const next = [...remaining, ...get];
  const hitters = next.filter((p) => !p.isPitcher).length;
  const pitchers = next.filter((p) => p.isPitcher).length;
  if (hitters > 14 || pitchers > 11 || next.length > 25) {
    return {
      accept: false,
      reason: "Roster limits",
      fairness,
      needScore: 0,
      giveValue,
      getValue,
    };
  }
  if (hitters < 9 || pitchers < 5) {
    return {
      accept: false,
      reason: "Would gut the roster",
      fairness,
      needScore: 0,
      giveValue,
      getValue,
    };
  }

  const needs = assessNeeds(remaining);
  const needScore = get.reduce((s, p) => s + needMatchScore(p, needs), 0);
  const givingStars = give.filter((p) => p.careerWAR >= 40);
  const gettingStars = get.filter((p) => p.careerWAR >= 40);

  // Dump / fleecing guards
  if (fairness < 0.72 && needScore < 0.85) {
    return {
      accept: false,
      reason: `Too one-sided (${fairness.toFixed(2)}x value)`,
      fairness,
      needScore,
      giveValue,
      getValue,
    };
  }
  if (givingStars.length && !gettingStars.length && fairness < 0.9) {
    return {
      accept: false,
      reason: "Won't move a star without star return",
      fairness,
      needScore,
      giveValue,
      getValue,
    };
  }

  // Accept fair value, or slightly below if it clearly fills a need
  const accept =
    fairness >= 0.92 ||
    (fairness >= 0.78 && needScore >= 0.9) ||
    (fairness >= 0.85 && needScore >= 0.45);

  return {
    accept,
    reason: accept
      ? needScore >= 0.45
        ? `Addresses needs (${fairness.toFixed(2)}x)`
        : `Fair value (${fairness.toFixed(2)}x)`
      : `Not enough value or fit (${fairness.toFixed(2)}x)`,
    fairness,
    needScore,
    giveValue,
    getValue,
  };
}

/** Pick the best FA target for a team's top need under cap/room rules. */
export function pickFreeAgentTarget(opts: {
  roster: GmPlayer[];
  freeAgents: GmPlayer[];
  salaryCap: number;
  payroll: number;
}): GmPlayer | null {
  const { roster, freeAgents, salaryCap, payroll } = opts;
  const needs = assessNeeds(roster);
  if (!needs.length) return null;
  const hitters = roster.filter((p) => !p.isPitcher).length;
  const pitchers = roster.filter((p) => p.isPitcher).length;
  if (roster.length >= 25) return null;

  let best: { p: GmPlayer; score: number } | null = null;
  for (const p of freeAgents) {
    if (payroll + p.salary > salaryCap) continue;
    if (!p.isPitcher && hitters >= 14) continue;
    if (p.isPitcher && pitchers >= 11) continue;
    const fit = needMatchScore(p, needs);
    if (fit < 0.35) continue;
    const score = fit * 10 + playerValue(p) * 0.15 - p.salary / 50_000_000;
    if (!best || score > best.score) best = { p, score };
  }
  return best?.p ?? null;
}

/** Fringe players a CPU may cut to open a roster/cap spot. */
export function pickCutCandidates(roster: GmPlayer[], count = 2): GmPlayer[] {
  return [...roster]
    .sort((a, b) => playerValue(a) - playerValue(b))
    .slice(0, count)
    .filter((p) => p.careerWAR < 12);
}

/**
 * Find a mutually acceptable 1-for-1 or 2-for-1 style swap between two rosters.
 */
export function findMutualTrade(opts: {
  aRoster: GmPlayer[];
  bRoster: GmPlayer[];
  aPayroll: number;
  bPayroll: number;
  salaryCap: number;
}): { aGive: GmPlayer[]; bGive: GmPlayer[]; reason: string } | null {
  const { aRoster, bRoster, aPayroll, bPayroll, salaryCap } = opts;
  const aNeeds = assessNeeds(aRoster);
  const bNeeds = assessNeeds(bRoster);

  // Prefer surplus, but also allow dealing non-stars that fill the other side's need
  const tradeChips = (roster: GmPlayer[], otherNeeds: RosterNeed[]) => {
    const surplus = assessSurplus(roster);
    const byNeed = [...roster]
      .filter((p) => needMatchScore(p, otherNeeds) >= 0.35 && p.careerWAR < 55)
      .sort((a, b) => playerValue(b) - playerValue(a));
    const seen = new Set<string>();
    const out: GmPlayer[] = [];
    for (const p of [...surplus, ...byNeed]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= 10) break;
    }
    return out;
  };

  const aChips = tradeChips(aRoster, bNeeds);
  const bChips = tradeChips(bRoster, aNeeds);

  type Cand = {
    aGive: GmPlayer[];
    bGive: GmPlayer[];
    score: number;
    reason: string;
  };
  const candidates: Cand[] = [];

  const consider = (aGive: GmPlayer[], bGive: GmPlayer[]) => {
    if (!aGive.length || !bGive.length) return;
    const forA = evaluateTradeForTeam({
      roster: aRoster,
      give: aGive,
      get: bGive,
      salaryCap,
      currentPayroll: aPayroll,
    });
    const forB = evaluateTradeForTeam({
      roster: bRoster,
      give: bGive,
      get: aGive,
      salaryCap,
      currentPayroll: bPayroll,
    });
    if (!forA.accept || !forB.accept) return;
    // Both sides should get at least some fit, or pure fair value
    if (forA.needScore < 0.25 && forB.needScore < 0.25 && forA.fairness < 0.95) {
      return;
    }
    const score =
      forA.needScore +
      forB.needScore +
      Math.min(forA.fairness, forB.fairness) +
      (1 - Math.abs(1 - forA.fairness));
    candidates.push({
      aGive,
      bGive,
      score,
      reason: `A: ${forA.reason}; B: ${forB.reason}`,
    });
  };

  // 1-for-1
  for (const ap of aChips) {
    for (const bp of bChips) {
      consider([ap], [bp]);
    }
  }

  // 2-for-1 when values diverge
  for (const bp of bChips.slice(0, 6)) {
    for (let i = 0; i < aChips.length; i++) {
      for (let j = i + 1; j < Math.min(aChips.length, i + 5); j++) {
        consider([aChips[i], aChips[j]], [bp]);
      }
    }
  }
  for (const ap of aChips.slice(0, 6)) {
    for (let i = 0; i < bChips.length; i++) {
      for (let j = i + 1; j < Math.min(bChips.length, i + 5); j++) {
        consider([ap], [bChips[i], bChips[j]]);
      }
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return { aGive: best.aGive, bGive: best.bGive, reason: best.reason };
}
