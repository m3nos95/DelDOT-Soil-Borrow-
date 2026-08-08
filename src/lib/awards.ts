/**
 * Season awards: MVP, Cy Young, Gold Glove, Silver Slugger.
 *
 * When both AL and NL have enough clubs, hardware is awarded per circuit.
 * Otherwise awards are league-wide (typical for small friends leagues).
 */
import { prisma } from "./db";
import { getFranchise } from "./franchises";
import { deriveDefense } from "./sim";
import {
  battingAverage,
  earnedRunAvg,
  onBasePctFull,
  sluggingPct,
  whip,
} from "./stats";

export const AWARD_KINDS = [
  "mvp",
  "cy_young",
  "gold_glove",
  "silver_slugger",
] as const;

export type AwardKind = (typeof AWARD_KINDS)[number];

export const GG_POSITIONS = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "P",
] as const;

export const SS_POSITIONS = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
] as const;

export type AwardPick = {
  award: AwardKind;
  position: string;
  circuit: string;
  playerId: string;
  teamId: string;
  score: number;
  note: string;
};

export function awardLabel(kind: AwardKind): string {
  switch (kind) {
    case "mvp":
      return "MVP";
    case "cy_young":
      return "Cy Young";
    case "gold_glove":
      return "Gold Glove";
    case "silver_slugger":
      return "Silver Slugger";
  }
}

function normalizePos(pos: string): string {
  const p = pos.trim().toUpperCase();
  if (p === "OF") return "CF";
  if (p === "UTIL") return "DH";
  if (p === "SP" || p === "RP" || p === "CL") return "P";
  return p;
}

function fmtAvg(n: number) {
  return n.toFixed(3).replace(/^0/, "");
}

function fmtEra(n: number) {
  return n.toFixed(2);
}

function teamCircuit(abbreviation: string): "AL" | "NL" | "LEAGUE" {
  return getFranchise(abbreviation)?.league ?? "LEAGUE";
}

type BatRow = {
  playerId: string;
  teamId: string;
  g: number;
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
  player: {
    id: string;
    name: string;
    primaryPos: string;
    isPitcher: boolean;
    careerWAR: number;
    goldGloves: number;
  };
  team: { id: string; abbreviation: string; wins: number; losses: number };
  fieldPos: string;
};

type PitchRow = {
  playerId: string;
  teamId: string;
  g: number;
  gs: number;
  outs: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  w: number;
  l: number;
  sv: number;
  player: {
    id: string;
    name: string;
    primaryPos: string;
    isPitcher: boolean;
    careerWAR: number;
    goldGloves: number;
  };
  team: { id: string; abbreviation: string; wins: number; losses: number };
};

function obpOf(s: BatRow) {
  return onBasePctFull(s.ab, s.h, s.bb, s.hbp, s.sf);
}
function slgOf(s: BatRow) {
  return sluggingPct(s.ab, s.h, s.doubles, s.triples, s.hr);
}

function battingScore(s: BatRow): number {
  const obp = obpOf(s);
  const slg = slgOf(s);
  const pa = s.ab + s.bb + s.hbp + s.sf;
  // OPS carries the rate signal now that we have real total bases
  const rateBoost = pa > 0 ? (obp + slg) * 120 * (pa / 550) : 0;
  const teamBoost = s.team.wins * 0.55;
  return (
    s.r * 2.2 +
    s.hr * 3.6 +
    s.rbi * 2.1 +
    s.sb * 1.4 +
    rateBoost +
    teamBoost
  );
}

function cyYoungScore(s: PitchRow): number {
  const ip = s.outs / 3;
  const era = earnedRunAvg(s.er, s.outs);
  const wHip = whip(s.h, s.bb, s.outs);
  const eraPart = ip * Math.max(0, 5.4 - era) * 1.15;
  const whipPart = ip * Math.max(0, 1.55 - wHip) * 8;
  return (
    eraPart +
    whipPart +
    s.w * 5.5 -
    s.l * 2.2 +
    s.so * 0.22 -
    s.bb * 0.18 -
    s.hr * 0.7 +
    s.sv * 1.1 +
    ip * 0.35
  );
}

function silverSluggerScore(s: BatRow): number {
  // Silver Slugger is a bat award — weight OPS + power heavily
  const ops = obpOf(s) + slgOf(s);
  return (
    s.hr * 3.8 +
    s.rbi * 1.5 +
    s.r * 1.0 +
    s.doubles * 0.8 +
    s.triples * 1.0 +
    ops * 260
  );
}

function goldGloveScore(
  s: BatRow | PitchRow,
  pos: string,
  isPitcher: boolean,
): number {
  const defense = deriveDefense({
    primaryPos: isPitcher ? "P" : pos,
    isPitcher,
    careerWAR: s.player.careerWAR,
    goldGloves: s.player.goldGloves,
  });
  const g = s.g;
  const ipFactor =
    "outs" in s
      ? Math.sqrt(Math.max(1, s.outs / 3))
      : Math.sqrt(Math.max(1, g));
  // Season games matter most; career GG is a soft prior so Brooks isn't automatic every year
  return defense * ipFactor + s.player.goldGloves * 0.35 + g * 0.2;
}

function batNote(s: BatRow): string {
  const avg = battingAverage(s.ab, s.h);
  const ops = obpOf(s) + slgOf(s);
  return `${s.hr} HR · ${s.rbi} RBI · ${fmtAvg(avg)} AVG · ${ops.toFixed(3).replace(/^0/, "")} OPS`;
}

function cyNote(s: PitchRow): string {
  const era = earnedRunAvg(s.er, s.outs);
  const ip = (s.outs / 3).toFixed(1);
  return `${s.w}-${s.l} · ${fmtEra(era)} ERA · ${s.so} K · ${ip} IP`;
}

function ssNote(s: BatRow): string {
  const avg = battingAverage(s.ab, s.h);
  const slg = slgOf(s);
  return `${fmtAvg(avg)} AVG · ${fmtAvg(slg)} SLG · ${s.hr} HR · ${s.rbi} RBI`;
}

function ggNote(s: BatRow | PitchRow, pos: string): string {
  if ("outs" in s) {
    return `${s.g} G · ${s.gs} GS · glove ${deriveDefense({
      primaryPos: "P",
      isPitcher: true,
      careerWAR: s.player.careerWAR,
      goldGloves: s.player.goldGloves,
    }).toFixed(0)}`;
  }
  return `${s.g} G · ${pos} · glove ${deriveDefense({
    primaryPos: s.player.primaryPos,
    careerWAR: s.player.careerWAR,
    goldGloves: s.player.goldGloves,
  }).toFixed(0)}`;
}

function pickBest<T>(
  rows: T[],
  scoreOf: (r: T) => number,
): { row: T; score: number } | null {
  let best: { row: T; score: number } | null = null;
  for (const row of rows) {
    const score = scoreOf(row);
    if (!best || score > best.score) best = { row, score };
  }
  return best;
}

function circuitsForTeams(
  teams: { abbreviation: string }[],
): Array<"AL" | "NL" | "LEAGUE"> {
  const al = teams.filter((t) => teamCircuit(t.abbreviation) === "AL").length;
  const nl = teams.filter((t) => teamCircuit(t.abbreviation) === "NL").length;
  // Need a real race in each circuit
  if (al >= 2 && nl >= 2) return ["AL", "NL"];
  return ["LEAGUE"];
}

function inCircuit(
  abbreviation: string,
  circuit: "AL" | "NL" | "LEAGUE",
): boolean {
  if (circuit === "LEAGUE") return true;
  return teamCircuit(abbreviation) === circuit;
}

/** Pure computation from loaded season lines. */
export function selectSeasonAwards(input: {
  batting: BatRow[];
  pitching: PitchRow[];
  teams: { abbreviation: string; wins: number; losses: number }[];
  /** Typical team games played — used for qualifying thresholds */
  teamGames: number;
}): AwardPick[] {
  const { batting, pitching, teams } = input;
  const tg = Math.max(1, input.teamGames);
  const circuits = circuitsForTeams(teams);
  const picks: AwardPick[] = [];

  // Rough batting-title / Cy Young workload gates scaled to games played
  const batQual = Math.max(15, Math.floor(tg * 2.1));
  const pitchQualOuts = Math.max(27, tg * 3); // ~1 IP per team game
  const ggBatQual = Math.max(10, Math.floor(tg * 0.75));
  const ggPitchQual = Math.max(18, Math.floor(tg * 1.15) * 3); // ~1.15 IP/game

  for (const circuit of circuits) {
    const bats = batting.filter(
      (b) => inCircuit(b.team.abbreviation, circuit) && b.ab >= batQual,
    );
    const arms = pitching.filter(
      (p) =>
        inCircuit(p.team.abbreviation, circuit) && p.outs >= pitchQualOuts,
    );

    // —— MVP (position players preferred; only a runaway Cy season steals it) ——
    const mvpHit = pickBest(bats, battingScore);
    const mvpArm = pickBest(arms, cyYoungScore);
    let mvp: AwardPick | null = null;
    // Pitcher MVP is rare — only a historic Cy season outruns a real bat race
    const armMvpScore = mvpArm ? mvpArm.score * 0.32 : 0;
    if (
      mvpArm &&
      mvpHit &&
      armMvpScore > mvpHit.score * 1.2
    ) {
      mvp = {
        award: "mvp",
        position: "",
        circuit,
        playerId: mvpArm.row.playerId,
        teamId: mvpArm.row.teamId,
        score: armMvpScore,
        note: cyNote(mvpArm.row),
      };
    } else if (mvpHit) {
      mvp = {
        award: "mvp",
        position: "",
        circuit,
        playerId: mvpHit.row.playerId,
        teamId: mvpHit.row.teamId,
        score: mvpHit.score,
        note: batNote(mvpHit.row),
      };
    } else if (mvpArm) {
      mvp = {
        award: "mvp",
        position: "",
        circuit,
        playerId: mvpArm.row.playerId,
        teamId: mvpArm.row.teamId,
        score: armMvpScore,
        note: cyNote(mvpArm.row),
      };
    }
    if (mvp) picks.push(mvp);

    // —— Cy Young ——
    const cy = pickBest(arms, cyYoungScore);
    if (cy) {
      picks.push({
        award: "cy_young",
        position: "",
        circuit,
        playerId: cy.row.playerId,
        teamId: cy.row.teamId,
        score: cy.score,
        note: cyNote(cy.row),
      });
    }

    // —— Silver Slugger by position ——
    for (const pos of SS_POSITIONS) {
      const pool = batting.filter(
        (b) =>
          inCircuit(b.team.abbreviation, circuit) &&
          b.ab >= batQual &&
          normalizePos(b.fieldPos) === pos,
      );
      const best = pickBest(pool, silverSluggerScore);
      if (!best) continue;
      picks.push({
        award: "silver_slugger",
        position: pos,
        circuit,
        playerId: best.row.playerId,
        teamId: best.row.teamId,
        score: best.score,
        note: ssNote(best.row),
      });
    }

    // —— Gold Glove by position ——
    for (const pos of GG_POSITIONS) {
      if (pos === "P") {
        const pool = pitching.filter(
          (p) =>
            inCircuit(p.team.abbreviation, circuit) &&
            p.outs >= ggPitchQual,
        );
        const best = pickBest(pool, (p) => goldGloveScore(p, "P", true));
        if (!best) continue;
        picks.push({
          award: "gold_glove",
          position: "P",
          circuit,
          playerId: best.row.playerId,
          teamId: best.row.teamId,
          score: best.score,
          note: ggNote(best.row, "P"),
        });
        continue;
      }
      const pool = batting.filter(
        (b) =>
          inCircuit(b.team.abbreviation, circuit) &&
          b.g >= ggBatQual &&
          normalizePos(b.fieldPos) === pos,
      );
      const best = pickBest(pool, (b) => goldGloveScore(b, pos, false));
      if (!best) continue;
      picks.push({
        award: "gold_glove",
        position: pos,
        circuit,
        playerId: best.row.playerId,
        teamId: best.row.teamId,
        score: best.score,
        note: ggNote(best.row, pos),
      });
    }
  }

  return picks;
}

async function loadAwardInputs(leagueId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (!league) throw new Error("League not found");

  const [batting, pitching, lineups] = await Promise.all([
    prisma.seasonBattingStat.findMany({
      where: { leagueId },
      include: { player: true, team: true },
    }),
    prisma.seasonPitchingStat.findMany({
      where: { leagueId },
      include: { player: true, team: true },
    }),
    prisma.lineupSlot.findMany({
      where: { team: { leagueId } },
      select: { teamId: true, playerId: true, position: true },
    }),
  ]);

  const posByTeamPlayer = new Map<string, string>();
  for (const slot of lineups) {
    posByTeamPlayer.set(`${slot.teamId}:${slot.playerId}`, slot.position);
  }

  const batRows: BatRow[] = batting.map((s) => ({
    playerId: s.playerId,
    teamId: s.teamId,
    g: s.g,
    ab: s.ab,
    r: s.r,
    h: s.h,
    rbi: s.rbi,
    bb: s.bb,
    so: s.so,
    hr: s.hr,
    sb: s.sb,
    doubles: s.doubles,
    triples: s.triples,
    hbp: s.hbp,
    sf: s.sf,
    player: s.player,
    team: s.team,
    fieldPos:
      posByTeamPlayer.get(`${s.teamId}:${s.playerId}`) ??
      s.player.primaryPos,
  }));

  const pitchRows: PitchRow[] = pitching.map((s) => ({
    playerId: s.playerId,
    teamId: s.teamId,
    g: s.g,
    gs: s.gs,
    outs: s.outs,
    h: s.h,
    r: s.r,
    er: s.er,
    bb: s.bb,
    so: s.so,
    hr: s.hr,
    w: s.w,
    l: s.l,
    sv: s.sv,
    player: s.player,
    team: s.team,
  }));

  const teamGames = Math.max(
    1,
    ...league.teams.map((t) => t.wins + t.losses),
    1,
  );

  return {
    league,
    batting: batRows,
    pitching: pitchRows,
    teams: league.teams,
    teamGames,
  };
}

/**
 * Compute and upsert awards for a league.
 * Call with finalized=true when the schedule is finished.
 */
export async function computeAndSaveAwards(
  leagueId: string,
  opts: { finalized?: boolean } = {},
) {
  const finalized = !!opts.finalized;
  const input = await loadAwardInputs(leagueId);
  const picks = selectSeasonAwards(input);

  await prisma.$transaction(async (tx) => {
    await tx.seasonAward.deleteMany({ where: { leagueId } });
    if (picks.length === 0) return;
    await tx.seasonAward.createMany({
      data: picks.map((p) => ({
        leagueId,
        award: p.award,
        position: p.position,
        circuit: p.circuit,
        playerId: p.playerId,
        teamId: p.teamId,
        score: p.score,
        note: p.note,
        finalized,
      })),
    });
  });

  return picks;
}

/** Load stored awards; recompute on the fly if none exist yet. */
export async function getLeagueAwards(leagueId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { league: null, awards: [], live: false };

  let awards = await prisma.seasonAward.findMany({
    where: { leagueId },
    include: {
      player: true,
      team: true,
    },
    orderBy: [{ award: "asc" }, { position: "asc" }, { circuit: "asc" }],
  });

  if (awards.length === 0 && (league.status === "season" || league.status === "complete")) {
    await computeAndSaveAwards(leagueId, {
      finalized: league.status === "complete",
    });
    awards = await prisma.seasonAward.findMany({
      where: { leagueId },
      include: { player: true, team: true },
      orderBy: [{ award: "asc" }, { position: "asc" }, { circuit: "asc" }],
    });
  } else if (
    awards.length > 0 &&
    league.status === "season" &&
    awards.every((a) => !a.finalized)
  ) {
    // Refresh live race during the season
    await computeAndSaveAwards(leagueId, { finalized: false });
    awards = await prisma.seasonAward.findMany({
      where: { leagueId },
      include: { player: true, team: true },
      orderBy: [{ award: "asc" }, { position: "asc" }, { circuit: "asc" }],
    });
  } else if (
    awards.length > 0 &&
    league.status === "complete" &&
    awards.some((a) => !a.finalized)
  ) {
    await computeAndSaveAwards(leagueId, { finalized: true });
    awards = await prisma.seasonAward.findMany({
      where: { leagueId },
      include: { player: true, team: true },
      orderBy: [{ award: "asc" }, { position: "asc" }, { circuit: "asc" }],
    });
  }

  return {
    league,
    awards,
    live: league.status === "season",
  };
}
