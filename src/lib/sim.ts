export type SimPlayer = {
  id: string;
  name: string;
  primaryPos: string;
  isPitcher: boolean;
  kRate: number;
  bbRate: number;
  hbpRate: number;
  singleRate: number;
  doubleRate: number;
  tripleRate: number;
  hrRate: number;
  stuff: number;
  control: number;
};

export type LineupEntry = {
  player: SimPlayer;
  battingOrder: number;
  position: string;
};

export type PlayEvent = {
  inning: number;
  half: "top" | "bottom";
  text: string;
  awayScore: number;
  homeScore: number;
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
  decision: "" | "W" | "L";
};

export type GameResult = {
  homeScore: number;
  awayScore: number;
  innings: number[];
  playByPlay: PlayEvent[];
  homeBox: { batters: BatterBox[]; pitchers: PitcherBox[] };
  awayBox: { batters: BatterBox[]; pitchers: PitcherBox[] };
  homePitcher: string;
  awayPitcher: string;
};

type BaseOccupant = { player: SimPlayer; scoredFrom?: number } | null;

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
  };
}

type Outcome =
  | "K"
  | "BB"
  | "HBP"
  | "1B"
  | "2B"
  | "3B"
  | "HR"
  | "OUT";

function resolvePa(
  batter: SimPlayer,
  pitcher: SimPlayer,
  rand: () => number,
): Outcome {
  const stuffMod = (pitcher.stuff - 50) / 100;
  const controlMod = (pitcher.control - 50) / 100;

  let k = clamp(batter.kRate * (1 + stuffMod * 0.55), 80, 420);
  let bb = clamp(batter.bbRate * (1 - controlMod * 0.7), 30, 220);
  let hbp = clamp(batter.hbpRate, 2, 30);
  let single = clamp(batter.singleRate * (1 - stuffMod * 0.25), 80, 240);
  let double = clamp(batter.doubleRate * (1 - stuffMod * 0.2), 20, 90);
  let triple = clamp(batter.tripleRate, 1, 25);
  let hr = clamp(batter.hrRate * (1 - stuffMod * 0.35), 5, 120);

  const contact = single + double + triple + hr;
  const nonOut = k + bb + hbp + contact;
  const out = Math.max(250, 1000 - nonOut);
  const total = k + bb + hbp + single + double + triple + hr + out;
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
    ["OUT", out],
  ];
  for (const [outcome, weight] of table) {
    acc += weight;
    if (roll < acc) return outcome;
  }
  return "OUT";
}

function advanceBases(
  bases: BaseOccupant[],
  batter: SimPlayer,
  basesToAdvance: number,
): { scored: SimPlayer[]; bases: BaseOccupant[] } {
  const scored: SimPlayer[] = [];
  const next: BaseOccupant[] = [null, null, null];

  for (let i = 2; i >= 0; i--) {
    const runner = bases[i];
    if (!runner) continue;
    const dest = i + basesToAdvance;
    if (dest >= 3) scored.push(runner.player);
    else next[dest] = runner;
  }

  if (basesToAdvance >= 4) {
    scored.push(batter);
  } else {
    next[basesToAdvance - 1] = { player: batter };
  }

  return { scored, bases: next };
}

export function simulateGame(opts: {
  homeLineup: LineupEntry[];
  awayLineup: LineupEntry[];
  homePitcher: SimPlayer;
  awayPitcher: SimPlayer;
  seed?: number;
}): GameResult {
  const rand = mulberry32(opts.seed ?? Date.now());
  const playByPlay: PlayEvent[] = [];
  const inningScores: number[] = [];

  const awayBatters = new Map(
    opts.awayLineup.map((e) => [e.player.id, emptyBatter(e.player)]),
  );
  const homeBatters = new Map(
    opts.homeLineup.map((e) => [e.player.id, emptyBatter(e.player)]),
  );
  const awayPitcherBox = emptyPitcher(opts.awayPitcher);
  const homePitcherBox = emptyPitcher(opts.homePitcher);

  let awayScore = 0;
  let homeScore = 0;
  let awayIdx = 0;
  let homeIdx = 0;
  let inning = 1;

  const log = (half: "top" | "bottom", text: string) => {
    playByPlay.push({ inning, half, text, awayScore, homeScore });
  };

  const batHalf = (
    half: "top" | "bottom",
    lineup: LineupEntry[],
    batters: Map<string, BatterBox>,
    pitcher: SimPlayer,
    pitcherBox: PitcherBox,
    startIdx: number,
    isHome: boolean,
  ) => {
    let outs = 0;
    let bases: BaseOccupant[] = [null, null, null];
    let runsThisHalf = 0;
    let idx = startIdx;
    let pa = 0;

    while (outs < 3 && pa < 40) {
      pa += 1;
      const entry = lineup[idx % lineup.length];
      idx += 1;
      const batter = entry.player;
      const box = batters.get(batter.id)!;
      const outcome = resolvePa(batter, pitcher, rand);

      if (outcome === "K") {
        outs += 1;
        box.ab += 1;
        box.so += 1;
        pitcherBox.so += 1;
        pitcherBox.ip += 1 / 3;
        log(half, `${batter.name} strikes out.`);
      } else if (outcome === "BB" || outcome === "HBP") {
        box.bb += outcome === "BB" ? 1 : 0;
        pitcherBox.bb += outcome === "BB" ? 1 : 0;
        const label = outcome === "BB" ? "walks" : "is hit by a pitch";
        // Force advance only when necessary
        if (bases[0] && bases[1] && bases[2]) {
          const scored = bases[2]!.player;
          bases[2] = bases[1];
          bases[1] = bases[0];
          bases[0] = { player: batter };
          runsThisHalf += 1;
          if (isHome) homeScore += 1;
          else awayScore += 1;
          batters.get(scored.id)!.r += 1;
          box.rbi += 1;
          pitcherBox.r += 1;
          pitcherBox.er += 1;
          log(half, `${batter.name} ${label}, forcing in ${scored.name}.`);
        } else if (bases[0] && bases[1]) {
          bases[2] = bases[1];
          bases[1] = bases[0];
          bases[0] = { player: batter };
          log(half, `${batter.name} ${label}.`);
        } else if (bases[0]) {
          bases[1] = bases[0];
          bases[0] = { player: batter };
          log(half, `${batter.name} ${label}.`);
        } else {
          bases[0] = { player: batter };
          log(half, `${batter.name} ${label}.`);
        }
      } else if (outcome === "OUT") {
        outs += 1;
        box.ab += 1;
        pitcherBox.ip += 1 / 3;
        const outsLeft = ["groundout", "flyout", "lineout"][Math.floor(rand() * 3)];
        // occasional sac fly / RBI groundout with runner on third < 2 outs
        if (bases[2] && outs < 3 && rand() < 0.28) {
          const scored = bases[2]!.player;
          bases[2] = null;
          runsThisHalf += 1;
          if (isHome) homeScore += 1;
          else awayScore += 1;
          batters.get(scored.id)!.r += 1;
          box.rbi += 1;
          pitcherBox.r += 1;
          pitcherBox.er += 1;
          log(half, `${batter.name} ${outsLeft} — ${scored.name} scores.`);
        } else {
          log(half, `${batter.name} ${outsLeft}.`);
        }
      } else {
        const advance =
          outcome === "1B" ? 1 : outcome === "2B" ? 2 : outcome === "3B" ? 3 : 4;
        box.ab += 1;
        box.h += 1;
        pitcherBox.h += 1;
        if (outcome === "HR") {
          box.hr += 1;
          pitcherBox.hr += 1;
        }
        const { scored, bases: nextBases } = advanceBases(bases, batter, advance);
        bases = nextBases;
        for (const runner of scored) {
          runsThisHalf += 1;
          if (isHome) homeScore += 1;
          else awayScore += 1;
          batters.get(runner.id)!.r += 1;
          box.rbi += 1;
          pitcherBox.r += 1;
          pitcherBox.er += 1;
        }
        const hitName =
          outcome === "1B"
            ? "singles"
            : outcome === "2B"
              ? "doubles"
              : outcome === "3B"
                ? "triples"
                : "homers";
        if (scored.length) {
          log(
            half,
            `${batter.name} ${hitName}${outcome === "HR" ? "!" : ""} — ${scored.length} run${scored.length > 1 ? "s" : ""} score.`,
          );
        } else {
          log(half, `${batter.name} ${hitName}.`);
        }
      }

    }

    inningScores.push(runsThisHalf);
    return idx;
  };

  while (inning <= 9 || awayScore === homeScore) {
    if (inning > 18) break; // safety
    log("top", `=== Top ${inning} ===`);
    awayIdx = batHalf(
      "top",
      opts.awayLineup,
      awayBatters,
      opts.homePitcher,
      homePitcherBox,
      awayIdx,
      false,
    );
    if (inning >= 9 && homeScore > awayScore) {
      inningScores.push(0);
      break;
    }
    log("bottom", `=== Bottom ${inning} ===`);
    homeIdx = batHalf(
      "bottom",
      opts.homeLineup,
      homeBatters,
      opts.awayPitcher,
      awayPitcherBox,
      homeIdx,
      true,
    );
    inning += 1;
  }

  if (homeScore > awayScore) {
    homePitcherBox.decision = "W";
    awayPitcherBox.decision = "L";
  } else if (awayScore > homeScore) {
    awayPitcherBox.decision = "W";
    homePitcherBox.decision = "L";
  }

  // Round IP to thirds display-friendly
  const roundIp = (p: PitcherBox) => {
    p.ip = Math.round(p.ip * 3) / 3;
  };
  roundIp(homePitcherBox);
  roundIp(awayPitcherBox);

  return {
    homeScore,
    awayScore,
    innings: inningScores,
    playByPlay,
    homeBox: {
      batters: opts.homeLineup.map((e) => awayBatters && homeBatters.get(e.player.id)!),
      pitchers: [homePitcherBox],
    },
    awayBox: {
      batters: opts.awayLineup.map((e) => awayBatters.get(e.player.id)!),
      pitchers: [awayPitcherBox],
    },
    homePitcher: opts.homePitcher.name,
    awayPitcher: opts.awayPitcher.name,
  };
}

export function formatIp(ip: number) {
  const whole = Math.floor(ip + 1e-9);
  const thirds = Math.round((ip - whole) * 3);
  return `${whole}.${thirds}`;
}
