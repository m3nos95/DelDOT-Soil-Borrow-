/**
 * Construction-aware baseball sim.
 *
 * Wins come from roster shape, not noise alone:
 * - L/R platoon (Randy Johnson vs lefty stacks hurts)
 * - SP stamina → real bullpen usage (short SP without RP collapses)
 * - Lineup sequencing (Rickey on, three Ks behind = stranded runs)
 * - Park / era climate, defense → BABIP, speed-based advancement
 */

import {
  ERAS,
  NEUTRAL_PARK,
  type EraEnv,
  type ParkFactors,
} from "./environment";

export {
  DYNASTY_ERAS,
  DYNASTY_ERA_BY_ID,
  ERAS,
  NEUTRAL_PARK,
  PARK_BY_CODE,
  dynastyEraById,
  dynastyEraPlayerWhere,
  eraById,
  eraOverlapYears,
  parkForCode,
  playerInDynastyEra,
  type DynastyEra,
  type EraEnv,
  type ParkFactors,
} from "./environment";

export type Hand = "L" | "R" | "S";

export type SimPlayer = {
  id: string;
  name: string;
  primaryPos: string;
  isPitcher: boolean;
  bats: Hand;
  throws: Hand;
  kRate: number;
  bbRate: number;
  hbpRate: number;
  singleRate: number;
  doubleRate: number;
  tripleRate: number;
  hrRate: number;
  stuff: number;
  control: number;
  durability: number;
  /** 0–100 speed; drives SB / GIDP avoidance / extra bases */
  speed: number;
  /** 0–100 glove; suppresses BIP hits when fielding */
  defense: number;
};

export type LineupEntry = {
  player: SimPlayer;
  battingOrder: number;
  position: string;
};

export type BullpenRole = "SP" | "LR" | "SU" | "CL" | "MU";

export type StaffArm = {
  player: SimPlayer;
  role: BullpenRole;
};

export type PitchType = "FF" | "SI" | "SL" | "CB" | "CH";

export type Pitch = {
  type: PitchType;
  /** approximate velocity, mph */
  velo: number;
  /** normalized horizontal location; strike zone is within [-1, 1] */
  x: number;
  /** normalized vertical location; strike zone is within [-1, 1] */
  y: number;
  result: "ball" | "called" | "swinging" | "foul" | "inplay" | "hbp";
  /** count BEFORE this pitch */
  balls: number;
  strikes: number;
};

export type PlayEvent = {
  inning: number;
  half: "top" | "bottom";
  text: string;
  awayScore: number;
  homeScore: number;
  /** Outs after this event (0–3) */
  outs: number;
  /** 1B / 2B / 3B occupied after this event */
  bases: [boolean, boolean, boolean];
  /** Pitcher on the mound after this event */
  pitcher: string;
  /** Batter at the plate (PA-resolving events only) */
  batter?: string;
  /** Pitch-by-pitch sequence for this plate appearance (broadcast view) */
  pitches?: Pitch[];
};

export type BatterBox = {
  playerId: string;
  name: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  hr: number;
  sb: number;
  doubles: number;
  triples: number;
  hbp: number;
  sf: number;
};

export type PitcherBox = {
  playerId: string;
  name: string;
  ip: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  decision: "" | "W" | "L" | "S" | "H";
  /** Quality start (starter, 6+ IP, ≤3 ER) */
  qs: number;
  /** Complete game */
  cg: number;
  /** Shutout (complete game, 0 runs) */
  sho: number;
};

export type FieldError = {
  playerId: string;
  name: string;
  pos: string;
  errors: number;
};

export type GameResult = {
  homeScore: number;
  awayScore: number;
  innings: number[];
  homeErrors: number;
  awayErrors: number;
  /** Per-player fielding errors for each side */
  homeFielding: FieldError[];
  awayFielding: FieldError[];
  playByPlay: PlayEvent[];
  homeBox: { batters: BatterBox[]; pitchers: PitcherBox[] };
  awayBox: { batters: BatterBox[]; pitchers: PitcherBox[] };
  homePitcher: string;
  awayPitcher: string;
};

type BaseOccupant = { player: SimPlayer } | null;

type Outcome = "K" | "BB" | "HBP" | "1B" | "2B" | "3B" | "HR" | "OUT" | "GIDP";

type LiveArm = {
  player: SimPlayer;
  role: BullpenRole;
  box: PitcherBox;
  bf: number;
  outsRecorded: number;
  runsAllowed: number;
  tired: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const PITCH_BASE_VELO: Record<PitchType, number> = {
  FF: 94,
  SI: 93,
  SL: 85,
  CH: 84,
  CB: 79,
};

function choosePitch(
  pitcher: SimPlayer,
  prand: () => number,
): { type: PitchType; velo: number } {
  const stuff = pitcher.stuff ?? 50;
  const r = prand();
  let type: PitchType;
  if (r < 0.52) type = prand() < 0.18 ? "SI" : "FF";
  else if (r < 0.74) type = "SL";
  else if (r < 0.9) type = "CH";
  else type = "CB";
  const velo = Math.round(
    PITCH_BASE_VELO[type] + (stuff - 50) * 0.12 + (prand() - 0.5) * 3,
  );
  return { type, velo };
}

function pitchLocation(
  result: Pitch["result"],
  prand: () => number,
): { x: number; y: number } {
  const edge = () => (prand() - 0.5) * 2; // -1..1
  const outAxis = () => (prand() < 0.5 ? -1 : 1) * (1.1 + prand() * 0.6);
  switch (result) {
    case "called":
      return { x: edge() * 0.85, y: edge() * 0.85 };
    case "swinging":
      // chase pitches: mostly low / just out of zone
      if (prand() < 0.6) {
        return {
          x: (prand() < 0.5 ? -1 : 1) * (0.7 + prand() * 0.5),
          y: -Math.abs(edge()) * 1.1 - 0.15,
        };
      }
      return { x: edge() * 0.9, y: edge() * 0.9 };
    case "foul":
      return { x: edge() * 1.0, y: edge() * 1.0 };
    case "inplay":
      return { x: edge() * 0.7, y: edge() * 0.7 };
    case "hbp":
      return { x: -1.5 - prand() * 0.3, y: -0.3 - prand() * 0.6 };
    case "ball":
    default:
      return prand() < 0.5
        ? { x: outAxis(), y: edge() * 1.1 }
        : { x: edge() * 1.1, y: outAxis() };
  }
}

function weightedInt(weights: number[], prand: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = prand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/**
 * Build a plausible pitch sequence that ends in the already-decided outcome.
 * Uses an INDEPENDENT rng (prand) so the statistical engine is untouched —
 * box scores are identical whether or not pitches are generated.
 */
export function buildPitchSequence(
  outcome: Outcome,
  pitcher: SimPlayer,
  prand: () => number,
): Pitch[] {
  const pitches: Pitch[] = [];

  // Count reached just BEFORE the terminal pitch
  let balls = 0;
  let strikes = 0;
  if (outcome === "K") {
    balls = weightedInt([0.34, 0.3, 0.22, 0.14], prand);
    strikes = 2;
  } else if (outcome === "BB") {
    strikes = weightedInt([0.3, 0.35, 0.35], prand);
    balls = 3;
  } else if (outcome === "HBP") {
    balls = weightedInt([0.5, 0.3, 0.2], prand);
    strikes = weightedInt([0.5, 0.3, 0.2], prand);
  } else {
    balls = weightedInt([0.4, 0.3, 0.2, 0.1], prand);
    strikes = weightedInt([0.42, 0.34, 0.24], prand);
  }

  const setup: ("B" | "S")[] = [
    ...Array<"B">(balls).fill("B"),
    ...Array<"S">(strikes).fill("S"),
  ];
  for (let i = setup.length - 1; i > 0; i--) {
    const j = Math.floor(prand() * (i + 1));
    [setup[i], setup[j]] = [setup[j], setup[i]];
  }

  let curB = 0;
  let curS = 0;
  const push = (result: Pitch["result"]) => {
    const { type, velo } = choosePitch(pitcher, prand);
    const loc = pitchLocation(result, prand);
    pitches.push({ type, velo, x: loc.x, y: loc.y, result, balls: curB, strikes: curS });
  };

  for (const s of setup) {
    if (s === "B") {
      push("ball");
      curB += 1;
    } else {
      // Setup strikes always advance the count. A foul here is a foul with
      // <2 strikes, which is still a strike; foul-offs at two strikes are
      // added separately below and do not advance.
      const rr = prand();
      const res: Pitch["result"] =
        rr < 0.24 ? "foul" : rr < 0.62 ? "swinging" : "called";
      push(res);
      curS = Math.min(2, curS + 1);
    }
  }

  // Foul-offs at two strikes add drama without changing the outcome
  if (curS === 2 && outcome !== "BB") {
    const extraFouls = weightedInt([0.55, 0.25, 0.13, 0.07], prand);
    for (let i = 0; i < extraFouls; i++) push("foul");
  }

  // Terminal pitch
  if (outcome === "K") {
    push(prand() < 0.66 ? "swinging" : "called");
  } else if (outcome === "BB") {
    push("ball");
  } else if (outcome === "HBP") {
    push("hbp");
  } else {
    push("inplay");
  }

  return pitches;
}

export function deriveSpeed(p: {
  tripleRate: number;
  hrRate: number;
  isPitcher: boolean;
}): number {
  if (p.isPitcher) return 30;
  // Triples proxy speed; pure mashers get dinged
  return clamp(28 + p.tripleRate * 3.2 - p.hrRate * 0.15, 20, 96);
}

/**
 * Position baseline + light WAR bump (helps pre-1957 gloves) + Gold Glove bonus.
 * GG award began in 1957 — earlier eras stay on position/WAR only.
 */
export function deriveDefense(p: {
  primaryPos: string;
  isPitcher?: boolean;
  careerWAR?: number;
  goldGloves?: number;
}): number {
  const gg = Math.max(0, p.goldGloves ?? 0);
  // Pitchers: Maddux-type gloves matter a little on come-backers / bunts proxy
  if (p.isPitcher) {
    return clamp(40 + Math.min(18, gg * 1.1), 35, 70);
  }
  const base: Record<string, number> = {
    C: 56,
    SS: 64,
    CF: 62,
    "2B": 58,
    "3B": 54,
    LF: 48,
    RF: 48,
    OF: 52,
    "1B": 40,
    DH: 28,
    UTIL: 50,
    P: 40,
  };
  let d = base[p.primaryPos] ?? 50;
  // Soft WAR signal for eras / players without GG hardware
  if (p.careerWAR != null) {
    d += clamp((p.careerWAR - 25) * 0.1, -6, 8);
  }
  // Gold Gloves: strong, with diminishing returns so 16× Brooks >> 5× Santo
  // 1st–5th: +2.4 each, 6th–10th: +1.6, 11+: +1.0 (cap +30)
  let ggBonus = 0;
  for (let i = 1; i <= gg; i++) {
    if (i <= 5) ggBonus += 2.4;
    else if (i <= 10) ggBonus += 1.6;
    else ggBonus += 1.0;
  }
  d += Math.min(30, ggBonus);
  return clamp(d, 20, 96);
}

/** Average glove of the 8 fielders (skip DH). */
export function lineupDefense(lineup: LineupEntry[]): number {
  const fielders = lineup.filter((e) => e.position !== "DH");
  if (fielders.length === 0) return 50;
  const sum = fielders.reduce((s, e) => s + (e.player.defense ?? 50), 0);
  return sum / fielders.length;
}

function emptyBatter(p: SimPlayer): BatterBox {
  return {
    playerId: p.id,
    name: p.name,
    ab: 0,
    r: 0,
    h: 0,
    rbi: 0,
    bb: 0,
    so: 0,
    hr: 0,
    sb: 0,
    doubles: 0,
    triples: 0,
    hbp: 0,
    sf: 0,
  };
}

function emptyPitcher(p: SimPlayer): PitcherBox {
  return {
    playerId: p.id,
    name: p.name,
    ip: 0,
    h: 0,
    r: 0,
    er: 0,
    bb: 0,
    so: 0,
    hr: 0,
    decision: "",
    qs: 0,
    cg: 0,
    sho: 0,
  };
}

/** Effective batter hand vs pitcher. Switch hitters take the platoon edge. */
export function batterHandVs(batter: SimPlayer, pitcher: SimPlayer): "L" | "R" {
  if (batter.bats === "S") return pitcher.throws === "L" ? "R" : "L";
  if (batter.bats === "L" || batter.bats === "R") return batter.bats;
  return "R";
}

/**
 * Platoon factor on offense (1 = neutral).
 * Same-side lefty vs elite LHP is brutal — the Randy Johnson problem.
 */
export function platoonOffenseFactor(
  batter: SimPlayer,
  pitcher: SimPlayer,
): number {
  const hand = batterHandVs(batter, pitcher);
  const sameSide = hand === pitcher.throws;
  const stuff = pitcher.stuff;
  if (!sameSide) {
    // Opposite hand boost; bigger vs soft tossers
    return clamp(1.06 + (55 - stuff) * 0.0015, 1.02, 1.14);
  }
  if (hand === "L" && pitcher.throws === "L") {
    // Lefty-on-lefty: scales hard with stuff (Unit / Sale / Kershaw)
    const crush = 0.78 - (stuff - 50) * 0.0045;
    return clamp(crush, 0.55, 0.92);
  }
  // Righty-on-righty: milder
  return clamp(0.9 - (stuff - 50) * 0.002, 0.78, 0.96);
}

function fatigueFactor(arm: LiveArm): number {
  // 1 = fresh, higher = worse for pitcher (batters feast)
  if (arm.role === "SP") {
    const budget = 18 + (arm.player.durability / 100) * 16; // ~18–34 BF
    const over = Math.max(0, arm.bf - budget * 0.72);
    return 1 + over * 0.035 + (arm.tired ? 0.12 : 0);
  }
  // Relievers spike after short usage
  const softCap = arm.role === "CL" ? 5 : arm.role === "SU" ? 6 : 9;
  const over = Math.max(0, arm.bf - softCap);
  return 1 + over * 0.06;
}

type PaClimate = {
  park: ParkFactors;
  era: EraEnv;
  /** Fielding team glove average */
  defense: number;
  /** Small home-field bump when batting at home */
  homeBat: boolean;
};

function resolvePa(
  batter: SimPlayer,
  arm: LiveArm,
  bases: BaseOccupant[],
  outs: number,
  rand: () => number,
  climate: PaClimate,
): Outcome {
  const pitcher = arm.player;
  const platoon = platoonOffenseFactor(batter, pitcher);
  const fatigue = fatigueFactor(arm);
  const stuffMod = (pitcher.stuff - 50) / 100;
  const controlMod = (pitcher.control - 50) / 100;
  const { park, era } = climate;
  // Elite gloves turn BIP into outs; poor gloves inflate singles/doubles
  const glove = 1 - (climate.defense - 50) / 220;
  const hfa = climate.homeBat ? 1.03 : 1;

  // Offense scaled by platoon; pitcher fatigue makes contact/power easier
  let k =
    batter.kRate *
    (1 + stuffMod * 0.6) *
    (2 - platoon) *
    (1.05 - (fatigue - 1) * 0.35) *
    era.k;
  let bb =
    batter.bbRate *
    (1 - controlMod * 0.65) *
    platoon *
    (0.95 + (fatigue - 1) * 0.4) *
    era.bb *
    hfa;
  let hbp = batter.hbpRate * (1 + (fatigue - 1) * 0.2);
  let single =
    batter.singleRate *
    (1 - stuffMod * 0.22) *
    platoon *
    fatigue *
    park.hit *
    era.babip *
    glove *
    hfa *
    park.run;
  let double =
    batter.doubleRate *
    (1 - stuffMod * 0.18) *
    platoon *
    fatigue *
    park.hit *
    era.babip *
    glove *
    hfa *
    park.run;
  let triple =
    batter.tripleRate * platoon * park.hit * era.babip * glove * park.run;
  let hr =
    batter.hrRate *
    (1 - stuffMod * 0.32) *
    platoon *
    (0.9 + (fatigue - 1) * 0.5) *
    park.hr *
    era.hr *
    hfa *
    Math.sqrt(park.run);

  // With RISP, contact hitters drive runs in; K machines strand them
  const risp = Boolean(bases[1] || bases[2]);
  if (risp) {
    const contactSkill = clamp(1 - batter.kRate / 320, 0.2, 1);
    k *= 1.08 - contactSkill * 0.05;
    single *= 0.88 + contactSkill * 0.28;
    double *= 0.9 + contactSkill * 0.25;
    hr *= 0.92 + contactSkill * 0.2;
  }

  k = clamp(k, 60, 450);
  bb = clamp(bb, 25, 240);
  hbp = clamp(hbp, 1, 35);
  single = clamp(single, 50, 280);
  double = clamp(double, 12, 110);
  triple = clamp(triple, 1, 32);
  hr = clamp(hr, 2, 145);

  const contact = single + double + triple + hr;
  const nonOut = k + bb + hbp + contact;
  let out = Math.max(200, 1000 - nonOut);
  // Defense steals hits → more outs on BIP
  out *= clamp(1 + (climate.defense - 50) / 180, 0.85, 1.2);

  // GIDP risk: runner on 1st, < 2 outs, slow batters
  let gidp = 0;
  if (bases[0] && !bases[1] && outs < 2) {
    const slow = (100 - batter.speed) / 100;
    // Better infields (proxy via team defense) turn more twin killings
    const dpGlove = clamp(1 + (climate.defense - 50) / 140, 0.85, 1.25);
    gidp = clamp(18 + slow * 55 + batter.hrRate * 0.08, 10, 90) * dpGlove;
    out = Math.max(120, out - gidp);
  }

  const total = k + bb + hbp + single + double + triple + hr + out + gidp;
  const roll = rand() * total;
  let acc = 0;
  const table: [Outcome, number][] = [
    ["K", k],
    ["BB", bb],
    ["HBP", hbp],
    ["1B", single],
    ["2B", double],
    ["3B", triple],
    ["HR", hr],
    ["GIDP", gidp],
    ["OUT", out],
  ];
  for (const [outcome, weight] of table) {
    acc += weight;
    if (roll < acc) return outcome;
  }
  return "OUT";
}

/**
 * Probabilistic advancement — speed decides first-to-third, score-from-2nd
 * on a single, score-from-1st on a double, etc.
 */
function advanceOnHit(
  bases: BaseOccupant[],
  batter: SimPlayer,
  hit: 1 | 2 | 3 | 4,
  rand: () => number,
): { scored: SimPlayer[]; bases: BaseOccupant[]; note: string } {
  if (hit >= 4) {
    const scored = [
      ...(bases[2] ? [bases[2].player] : []),
      ...(bases[1] ? [bases[1].player] : []),
      ...(bases[0] ? [bases[0].player] : []),
      batter,
    ];
    return { scored, bases: [null, null, null], note: "" };
  }

  const scored: SimPlayer[] = [];
  const next: BaseOccupant[] = [null, null, null];
  const bits: string[] = [];
  const spd = (p: SimPlayer) => p.speed;

  if (hit === 3) {
    for (const occ of bases) {
      if (occ) scored.push(occ.player);
    }
    next[2] = { player: batter };
    return { scored, bases: next, note: "" };
  }

  if (hit === 2) {
    if (bases[2]) scored.push(bases[2].player);
    if (bases[1]) scored.push(bases[1].player);
    if (bases[0]) {
      const r = bases[0].player;
      // Score from first on a double — speed decides
      const pScore = clamp(0.28 + (spd(r) - 50) * 0.007, 0.18, 0.78);
      if (rand() < pScore) {
        scored.push(r);
        bits.push(`${r.name} scores from first`);
      } else {
        next[2] = { player: r };
      }
    }
    next[1] = { player: batter };
    return { scored, bases: next, note: bits.join("; ") };
  }

  // Single
  if (bases[2]) {
    // Almost always scores; slow trailers rarely held
    const pScore = clamp(0.88 + (spd(bases[2].player) - 40) * 0.002, 0.75, 0.98);
    if (rand() < pScore) scored.push(bases[2].player);
    else next[2] = bases[2];
  }
  if (bases[1]) {
    const r = bases[1].player;
    const pScore = clamp(0.38 + (spd(r) - 50) * 0.008, 0.22, 0.82);
    if (rand() < pScore) {
      scored.push(r);
      bits.push(`${r.name} scores from second`);
    } else if (!next[2]) {
      next[2] = { player: r };
    } else {
      // 3B occupied (held) — stay at 2B rare; force score or hold 2B empty→3B taken
      scored.push(r);
    }
  }
  if (bases[0]) {
    const r = bases[0].player;
    // First-to-third on a single when 2B/3B clear enough
    const laneOpen = !next[2];
    const pThird = laneOpen
      ? clamp(0.22 + (spd(r) - 55) * 0.009, 0.08, 0.62)
      : 0;
    if (rand() < pThird) {
      next[2] = { player: r };
      bits.push(`${r.name} first to third`);
    } else if (!next[1]) {
      next[1] = { player: r };
    } else {
      // Traffic — hold at first somehow shouldn't happen; squeeze to 2B empty
      next[1] = { player: r };
    }
  }
  next[0] = { player: batter };
  return { scored, bases: next, note: bits.join("; ") };
}

function spTargetOuts(sp: SimPlayer, rand: () => number): number {
  // Durability 50 → ~5.5 IP, 90 → ~7.5, 30 → ~4
  const mean = 12 + (sp.durability / 100) * 12; // outs
  const jitter = (rand() - 0.5) * 4;
  return clamp(Math.round(mean + jitter), 9, 27);
}

function shouldPullStarter(
  arm: LiveArm,
  targetOuts: number,
  inning: number,
  outs: number,
  bases: BaseOccupant[],
  scoreDiff: number, // positive if this pitcher's team is leading
  rand: () => number,
): boolean {
  if (arm.outsRecorded >= targetOuts) return true;
  if (arm.bf >= 28 + arm.player.durability / 10) return true;
  // Traffic + fatigue in late game
  const traffic = bases.filter(Boolean).length;
  if (arm.outsRecorded >= targetOuts - 3 && traffic >= 2 && rand() < 0.55) {
    return true;
  }
  if (inning >= 7 && arm.outsRecorded >= 15 && scoreDiff >= 0 && rand() < 0.35) {
    return true;
  }
  if (arm.runsAllowed >= 6 && arm.outsRecorded >= 9) return true;
  // High-leverage late: don't leave a gassed SP for the 9th
  if (inning >= 8 && outs + arm.outsRecorded >= targetOuts - 1) return true;
  return false;
}

function pickReliever(
  pen: StaffArm[],
  used: Set<string>,
  inning: number,
  scoreDiff: number, // from fielding team's POV
  earlyExit: boolean,
): StaffArm | null {
  const available = pen.filter((a) => !used.has(a.player.id));
  if (available.length === 0) return null;

  const byRole = (role: BullpenRole) =>
    available.find((a) => a.role === role) ?? null;

  // Save situation
  if (inning >= 9 && scoreDiff > 0 && scoreDiff <= 3) {
    return byRole("CL") ?? byRole("SU") ?? available[0];
  }
  // Setup
  if (inning >= 8 && scoreDiff >= 0) {
    return byRole("SU") ?? byRole("CL") ?? byRole("LR") ?? available[0];
  }
  // Starter blew up early — need length
  if (earlyExit || inning <= 6) {
    return byRole("LR") ?? byRole("MU") ?? byRole("SU") ?? available[0];
  }
  return byRole("SU") ?? byRole("LR") ?? byRole("MU") ?? byRole("CL") ?? available[0];
}

function tryStolenBase(
  bases: BaseOccupant[],
  pitcher: SimPlayer,
  batters: Map<string, BatterBox>,
  rand: () => number,
): { bases: BaseOccupant[]; out: boolean; text?: string } {
  // Only 1st → 2nd with open second
  if (!bases[0] || bases[1]) return { bases, out: false };
  const runner = bases[0]!.player;
  const chance = clamp((runner.speed - 55) / 100, 0, 0.42);
  // Better control pitchers control the running game a bit
  const hold = clamp((pitcher.control - 50) / 400, -0.05, 0.08);
  if (rand() > chance - hold) return { bases, out: false };

  const success = clamp(0.55 + (runner.speed - 60) * 0.006, 0.45, 0.9);
  if (rand() < success) {
    batters.get(runner.id)!.sb += 1;
    return {
      bases: [null, { player: runner }, bases[2]],
      out: false,
      text: `${runner.name} steals second.`,
    };
  }
  return {
    bases: [null, null, bases[2]],
    out: true,
    text: `${runner.name} caught stealing.`,
  };
}

export function simulateGame(opts: {
  homeLineup: LineupEntry[];
  awayLineup: LineupEntry[];
  homeStaff: StaffArm[];
  awayStaff: StaffArm[];
  seed?: number;
  /** Home park factors (default neutral) */
  park?: ParkFactors;
  /** League era climate (default neutral — career rates as-is) */
  era?: EraEnv;
}): GameResult {
  const rand = mulberry32(opts.seed ?? Date.now());
  // Independent stream for pitch-by-pitch flavor — never perturbs `rand`,
  // so box scores / stats are byte-for-byte the same with or without it.
  const prand = mulberry32((((opts.seed ?? Date.now()) >>> 0) ^ 0x9e3779b9) >>> 0);
  const playByPlay: PlayEvent[] = [];
  const inningScores: number[] = [];
  const park = opts.park ?? NEUTRAL_PARK;
  const era = opts.era ?? ERAS.neutral;
  const homeGlove = lineupDefense(opts.homeLineup);
  const awayGlove = lineupDefense(opts.awayLineup);

  // Fielding errors tracked per side and attributed to a fielder
  let homeErrors = 0;
  let awayErrors = 0;
  const homeFieldErrors = new Map<string, FieldError>();
  const awayFieldErrors = new Map<string, FieldError>();

  const ERROR_POS_WEIGHTS: [string, number][] = [
    ["SS", 0.22],
    ["3B", 0.18],
    ["2B", 0.15],
    ["1B", 0.1],
    ["C", 0.05],
    ["LF", 0.09],
    ["CF", 0.09],
    ["RF", 0.09],
    ["P", 0.03],
  ];

  const chargeError = (
    fieldingLineup: LineupEntry[],
    errMap: Map<string, FieldError>,
  ) => {
    let roll = rand();
    let pos = "SS";
    for (const [p, w] of ERROR_POS_WEIGHTS) {
      roll -= w;
      if (roll < 0) {
        pos = p;
        break;
      }
    }
    // Find a fielder at that position; fall back to any infielder
    const slot =
      fieldingLineup.find((e) => e.position === pos) ??
      fieldingLineup.find((e) => e.position === "SS") ??
      fieldingLineup[0];
    if (!slot) return;
    const prev = errMap.get(slot.player.id);
    if (prev) prev.errors += 1;
    else
      errMap.set(slot.player.id, {
        playerId: slot.player.id,
        name: slot.player.name,
        pos,
        errors: 1,
      });
  };

  const awayBatters = new Map(
    opts.awayLineup.map((e) => [e.player.id, emptyBatter(e.player)]),
  );
  const homeBatters = new Map(
    opts.homeLineup.map((e) => [e.player.id, emptyBatter(e.player)]),
  );

  const homePitcherBoxes: PitcherBox[] = [];
  const awayPitcherBoxes: PitcherBox[] = [];

  const homeSp =
    opts.homeStaff.find((a) => a.role === "SP")?.player ??
    opts.homeStaff[0]?.player;
  const awaySp =
    opts.awayStaff.find((a) => a.role === "SP")?.player ??
    opts.awayStaff[0]?.player;
  if (!homeSp || !awaySp) throw new Error("Each team needs a starting pitcher");

  const homePen = opts.homeStaff.filter((a) => a.role !== "SP");
  const awayPen = opts.awayStaff.filter((a) => a.role !== "SP");

  let awayScore = 0;
  let homeScore = 0;
  let awayIdx = 0;
  let homeIdx = 0;
  let inning = 1;

  // W/L tracking: pitcher of record when lead changes
  // Use a bag so closure assignments are visible to later reads under TS CFA
  const decision = {
    win: null as PitcherBox | null,
    loss: null as PitcherBox | null,
    homeSave: null as LiveArm | null,
    awaySave: null as LiveArm | null,
  };

  const packBases = (bases: BaseOccupant[]): [boolean, boolean, boolean] => [
    Boolean(bases[0]),
    Boolean(bases[1]),
    Boolean(bases[2]),
  ];

  const log = (
    half: "top" | "bottom",
    text: string,
    sit: { outs?: number; bases?: BaseOccupant[] } = {},
    extra: { pitches?: Pitch[]; batter?: string } = {},
  ) => {
    const fieldingHome = half === "top";
    const arm = fieldingHome ? homeArm : awayArm;
    playByPlay.push({
      inning,
      half,
      text,
      awayScore,
      homeScore,
      outs: sit.outs ?? 0,
      bases: packBases(sit.bases ?? [null, null, null]),
      pitcher: arm?.player.name ?? "",
      pitches: extra.pitches,
      batter: extra.batter,
    });
  };

  const makeLive = (player: SimPlayer, role: BullpenRole): LiveArm => {
    const box = emptyPitcher(player);
    if (role === "SP" || homePitcherBoxes.length + awayPitcherBoxes.length < 20) {
      // push later based on side
    }
    return { player, role, box, bf: 0, outsRecorded: 0, runsAllowed: 0, tired: false };
  };

  let homeArm = makeLive(homeSp, "SP");
  homePitcherBoxes.push(homeArm.box);
  let awayArm = makeLive(awaySp, "SP");
  awayPitcherBoxes.push(awayArm.box);

  const homeUsed = new Set<string>([homeSp.id]);
  const awayUsed = new Set<string>([awaySp.id]);
  const homeSpTarget = spTargetOuts(homeSp, rand);
  const awaySpTarget = spTargetOuts(awaySp, rand);
  let homeEarlyExit = false;
  let awayEarlyExit = false;

  const bringIn = (
    side: "home" | "away",
    half: "top" | "bottom",
    reason: string,
    sit: { outs: number; bases: BaseOccupant[] },
  ) => {
    const fieldingHome = half === "top";
    const isHomePen = side === "home";
    const scoreDiff = isHomePen
      ? homeScore - awayScore
      : awayScore - homeScore;
    const early = isHomePen ? homeEarlyExit : awayEarlyExit;
    const pick = pickReliever(
      isHomePen ? homePen : awayPen,
      isHomePen ? homeUsed : awayUsed,
      inning,
      scoreDiff,
      early,
    );
    if (!pick) {
      // Nobody left — gassed starter/reliever stays, marked tired
      const arm = isHomePen ? homeArm : awayArm;
      arm.tired = true;
      log(
        half,
        `${arm.player.name} stays on with an empty pen (${reason}).`,
        sit,
      );
      return;
    }
    const live = makeLive(pick.player, pick.role);
    if (isHomePen) {
      homeArm = live;
      homePitcherBoxes.push(live.box);
      homeUsed.add(pick.player.id);
      if (pick.role === "CL") decision.homeSave = live;
    } else {
      awayArm = live;
      awayPitcherBoxes.push(live.box);
      awayUsed.add(pick.player.id);
      if (pick.role === "CL") decision.awaySave = live;
    }
    log(
      half,
      `${pick.player.name} enters from the pen (${pick.role}) — ${reason}.`,
      sit,
    );
  };

  const maybeHook = (
    half: "top" | "bottom",
    outs: number,
    bases: BaseOccupant[],
  ) => {
    const fieldingHome = half === "top";
    const arm = fieldingHome ? homeArm : awayArm;
    const sit = { outs, bases };
    if (arm.role !== "SP") {
      // Pull tired reliever in trouble
      if (arm.bf >= 8 || (arm.tired && bases.filter(Boolean).length >= 2)) {
        bringIn(fieldingHome ? "home" : "away", half, "reliever spent", sit);
      }
      return;
    }
    const target = fieldingHome ? homeSpTarget : awaySpTarget;
    const scoreDiff = fieldingHome
      ? homeScore - awayScore
      : awayScore - homeScore;
    if (
      shouldPullStarter(arm, target, inning, outs, bases, scoreDiff, rand)
    ) {
      if (arm.outsRecorded <= 12) {
        if (fieldingHome) homeEarlyExit = true;
        else awayEarlyExit = true;
      }
      bringIn(
        fieldingHome ? "home" : "away",
        half,
        arm.outsRecorded <= 12 ? "early exit" : "pitch count / traffic",
        sit,
      );
    }
  };

  const noteLeadChange = (
    fieldingHome: boolean,
    prevHome: number,
    prevAway: number,
  ) => {
    const arm = fieldingHome ? homeArm : awayArm;
    const becameHomeLead = homeScore > awayScore && prevHome <= prevAway;
    const becameAwayLead = awayScore > homeScore && prevAway <= prevHome;
    if (becameHomeLead) {
      // Away pitcher just gave up the lead
      decision.loss = awayArm.box;
      decision.win = homeArm.box;
    } else if (becameAwayLead) {
      decision.loss = homeArm.box;
      decision.win = awayArm.box;
    }
    void arm;
  };

  const batHalf = (
    half: "top" | "bottom",
    lineup: LineupEntry[],
    batters: Map<string, BatterBox>,
    startIdx: number,
  ) => {
    const fieldingHome = half === "top";
    let outs = 0;
    let bases: BaseOccupant[] = [null, null, null];
    let runsThisHalf = 0;
    let idx = startIdx;
    let pa = 0;

    // Fresh half — consider hooking starter for the 8th/9th before first pitch
    if (inning >= 8) {
      maybeHook(half, 0, bases);
    }

    while (outs < 3 && pa < 40) {
      pa += 1;
      let arm = fieldingHome ? homeArm : awayArm;

      // Steal attempt before the PA when leadoff speed sits on 1st
      const steal = tryStolenBase(bases, arm.player, batters, rand);
      bases = steal.bases;
      if (steal.out) {
        outs += 1;
        arm.outsRecorded += 1;
        arm.box.ip += 1 / 3;
      }
      if (steal.text) {
        log(half, steal.text, { outs, bases });
        if (outs >= 3) break;
      }

      const entry = lineup[idx % lineup.length];
      idx += 1;
      const batter = entry.player;
      const box = batters.get(batter.id)!;
      arm = fieldingHome ? homeArm : awayArm;
      arm.bf += 1;

      const hand = batterHandVs(batter, arm.player);
      const platoon = platoonOffenseFactor(batter, arm.player);
      const climate: PaClimate = {
        park,
        era,
        defense: fieldingHome ? homeGlove : awayGlove,
        homeBat: !fieldingHome,
      };
      const outcome = resolvePa(batter, arm, bases, outs, rand, climate);
      const pitches = buildPitchSequence(outcome, arm.player, prand);
      const pa_ = { pitches, batter: batter.name };

      const prevHome = homeScore;
      const prevAway = awayScore;

      const creditRun = (runner: SimPlayer, rbiBatter: boolean) => {
        runsThisHalf += 1;
        if (fieldingHome) {
          // home pitching, away scoring
          awayScore += 1;
        } else {
          homeScore += 1;
        }
        batters.get(runner.id)!.r += 1;
        if (rbiBatter) box.rbi += 1;
        arm.box.r += 1;
        arm.box.er += 1;
        arm.runsAllowed += 1;
      };

      // Run scored on a fielding error — charged but UNEARNED (no ER, no RBI)
      const creditUnearnedRun = (runner: SimPlayer) => {
        runsThisHalf += 1;
        if (fieldingHome) awayScore += 1;
        else homeScore += 1;
        batters.get(runner.id)!.r += 1;
        arm.box.r += 1;
        arm.runsAllowed += 1;
      };

      if (outcome === "K") {
        outs += 1;
        box.ab += 1;
        box.so += 1;
        arm.box.so += 1;
        arm.box.ip += 1 / 3;
        arm.outsRecorded += 1;
        const tag =
          platoon < 0.85 && hand === arm.player.throws
            ? ` (tough ${hand}HB vs ${arm.player.throws}HP)`
            : "";
        log(half, `${batter.name} strikes out${tag}.`, { outs, bases }, pa_);
      } else if (outcome === "GIDP") {
        box.ab += 1;
        arm.box.ip += 2 / 3;
        arm.outsRecorded += 2;
        const runner = bases[0]!.player;
        bases = [null, null, bases[2]];
        outs = Math.min(3, outs + 2);
        log(
          half,
          `${batter.name} grounds into a double play (${runner.name} out at second).`,
          { outs, bases },
          pa_,
        );
      } else if (outcome === "BB" || outcome === "HBP") {
        if (outcome === "BB") {
          box.bb += 1;
          arm.box.bb += 1;
        } else {
          box.hbp += 1;
        }
        const label = outcome === "BB" ? "walks" : "is hit by a pitch";
        if (bases[0] && bases[1] && bases[2]) {
          creditRun(bases[2]!.player, true);
          bases[2] = bases[1];
          bases[1] = bases[0];
          bases[0] = { player: batter };
          log(
            half,
            `${batter.name} ${label}, forcing in a run.`,
            { outs, bases },
            pa_,
          );
        } else if (bases[0] && bases[1]) {
          bases[2] = bases[1];
          bases[1] = bases[0];
          bases[0] = { player: batter };
          log(half, `${batter.name} ${label}.`, { outs, bases }, pa_);
        } else if (bases[0]) {
          bases[1] = bases[0];
          bases[0] = { player: batter };
          log(half, `${batter.name} ${label}.`, { outs, bases }, pa_);
        } else {
          bases[0] = { player: batter };
          log(half, `${batter.name} ${label}.`, { outs, bases }, pa_);
        }
      } else if (outcome === "OUT") {
        // Fielding error can turn a would-be out into reached-on-error
        const glove = fieldingHome ? homeGlove : awayGlove;
        const errChance = clamp(0.03 - (glove - 50) * 0.0009, 0.006, 0.05);
        if (rand() < errChance) {
          box.ab += 1; // ROE is an at-bat, not a hit
          if (fieldingHome) {
            homeErrors += 1;
            chargeError(opts.homeLineup, homeFieldErrors);
          } else {
            awayErrors += 1;
            chargeError(opts.awayLineup, awayFieldErrors);
          }
          // Batter safe at first; runners forced up one base
          const scoredE: SimPlayer[] = [];
          const nextE: BaseOccupant[] = [null, null, null];
          if (bases[2]) scoredE.push(bases[2].player);
          if (bases[1]) nextE[2] = bases[1];
          if (bases[0]) nextE[1] = bases[0];
          nextE[0] = { player: batter };
          bases = nextE;
          for (const r of scoredE) creditUnearnedRun(r);
          const tail = scoredE.length
            ? ` — ${scoredE.length} unearned run${scoredE.length > 1 ? "s" : ""} score`
            : "";
          log(
            half,
            `${batter.name} reaches on an error${tail}.`,
            { outs, bases },
            pa_,
          );
          noteLeadChange(fieldingHome, prevHome, prevAway);
          if (outs < 3) maybeHook(half, outs, bases);
          continue;
        }
        outs += 1;
        arm.box.ip += 1 / 3;
        arm.outsRecorded += 1;
        const kind = ["grounds out", "flies out", "lines out"][
          Math.floor(rand() * 3)
        ];
        // Sac fly / productive out with runner on 3rd < 2 outs — contact hitters better
        const contactSkill = clamp(
          1 - batter.kRate / 350 + batter.singleRate / 400,
          0.15,
          0.7,
        );
        const isSacFly = !!bases[2] && outs < 3 && rand() < 0.22 + contactSkill * 0.25;
        if (isSacFly) {
          // Sacrifice fly: not an at-bat, RBI credited
          box.sf += 1;
          creditRun(bases[2]!.player, true);
          bases[2] = null;
          log(
            half,
            `${batter.name} ${kind} — run scores from third.`,
            { outs, bases },
            pa_,
          );
        } else {
          box.ab += 1;
          log(half, `${batter.name} ${kind}.`, { outs, bases }, pa_);
        }
      } else {
        const hit =
          outcome === "1B" ? 1 : outcome === "2B" ? 2 : outcome === "3B" ? 3 : 4;
        box.ab += 1;
        box.h += 1;
        arm.box.h += 1;
        if (outcome === "2B") box.doubles += 1;
        else if (outcome === "3B") box.triples += 1;
        else if (outcome === "HR") {
          box.hr += 1;
          arm.box.hr += 1;
        }
        const {
          scored,
          bases: nextBases,
          note,
        } = advanceOnHit(bases, batter, hit as 1 | 2 | 3 | 4, rand);
        bases = nextBases;
        for (const runner of scored) creditRun(runner, true);
        const hitName =
          outcome === "1B"
            ? "singles"
            : outcome === "2B"
              ? "doubles"
              : outcome === "3B"
                ? "triples"
                : "homers";
        let text = `${batter.name} ${hitName}${outcome === "HR" ? "!" : ""}`;
        if (scored.length) {
          text += ` — ${scored.length} run${scored.length > 1 ? "s" : ""} score`;
        }
        if (note) text += ` (${note})`;
        text += ".";
        log(half, text, { outs, bases }, pa_);
      }

      noteLeadChange(fieldingHome, prevHome, prevAway);

      if (outs < 3) {
        maybeHook(half, outs, bases);
      }
    }

    // Closer save notation opportunity tracked at end
    inningScores.push(runsThisHalf);
    return idx;
  };

  while (inning <= 9 || awayScore === homeScore) {
    if (inning > 18) break;
    log("top", `=== Top ${inning} ===`);
    awayIdx = batHalf("top", opts.awayLineup, awayBatters, awayIdx);
    if (inning >= 9 && homeScore > awayScore) {
      inningScores.push(0);
      break;
    }
    log("bottom", `=== Bottom ${inning} ===`);
    homeIdx = batHalf("bottom", opts.homeLineup, homeBatters, homeIdx);
    inning += 1;
  }

  // Decisions
  for (const b of [...homePitcherBoxes, ...awayPitcherBoxes]) {
    if (b.decision === "W" || b.decision === "L") b.decision = "";
  }
  if (homeScore > awayScore) {
    (decision.win ?? homePitcherBoxes[0]).decision = "W";
    (decision.loss ?? awayPitcherBoxes[0]).decision = "L";
    if (
      decision.homeSave &&
      decision.homeSave.box !== decision.win &&
      homeScore - awayScore <= 3 &&
      decision.homeSave.box.ip > 0
    ) {
      decision.homeSave.box.decision = "S";
    }
  } else if (awayScore > homeScore) {
    (decision.win ?? awayPitcherBoxes[0]).decision = "W";
    (decision.loss ?? homePitcherBoxes[0]).decision = "L";
    if (
      decision.awaySave &&
      decision.awaySave.box !== decision.win &&
      awayScore - homeScore <= 3 &&
      decision.awaySave.box.ip > 0
    ) {
      decision.awaySave.box.decision = "S";
    }
  }

  const roundIp = (p: PitcherBox) => {
    p.ip = Math.round(p.ip * 3) / 3;
  };
  homePitcherBoxes.forEach(roundIp);
  awayPitcherBoxes.forEach(roundIp);

  // Quality starts, complete games, shutouts
  const markStaffMilestones = (boxes: PitcherBox[]) => {
    const sp = boxes[0];
    if (sp && sp.ip >= 5.999 && sp.er <= 3) sp.qs = 1;
    if (boxes.length === 1 && sp) {
      // One pitcher covered the whole game for this team
      sp.cg = 1;
      if (sp.r === 0) sp.sho = 1;
    }
  };
  markStaffMilestones(homePitcherBoxes);
  markStaffMilestones(awayPitcherBoxes);

  return {
    homeScore,
    awayScore,
    innings: inningScores,
    homeErrors,
    awayErrors,
    homeFielding: [...homeFieldErrors.values()],
    awayFielding: [...awayFieldErrors.values()],
    playByPlay,
    homeBox: {
      batters: opts.homeLineup.map((e) => homeBatters.get(e.player.id)!),
      pitchers: homePitcherBoxes,
    },
    awayBox: {
      batters: opts.awayLineup.map((e) => awayBatters.get(e.player.id)!),
      pitchers: awayPitcherBoxes,
    },
    homePitcher: homeSp.name,
    awayPitcher: awaySp.name,
  };
}

export function formatIp(ip: number) {
  const whole = Math.floor(ip + 1e-9);
  const thirds = Math.round((ip - whole) * 3);
  return `${whole}.${thirds}`;
}
