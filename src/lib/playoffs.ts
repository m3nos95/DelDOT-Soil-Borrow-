import { prisma } from "./db";

/** Largest power of two ≤ n, clamped to [2, 8]. */
function bracketSizeFor(teamCount: number): number {
  if (teamCount < 2) return 0;
  let b = 2;
  while (b * 2 <= teamCount && b < 8) b *= 2;
  return b;
}

function roundNames(bracketSize: number): string[] {
  if (bracketSize >= 8) return ["Quarterfinal", "Semifinal", "Final"];
  if (bracketSize >= 4) return ["Semifinal", "Final"];
  return ["Final"];
}

function bestOfFor(roundName: string): number {
  return roundName === "Final" ? 7 : 5;
}

function winsNeeded(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

/** MLB-ish home pattern: higher seed hosts the bookends. */
function higherSeedHomeForGame(bestOf: number, gameIndex1: number): boolean {
  if (bestOf >= 7) return [1, 2, 6, 7].includes(gameIndex1);
  if (bestOf >= 5) return [1, 2, 5].includes(gameIndex1);
  return gameIndex1 % 2 === 1;
}

async function maxDay(leagueId: string): Promise<number> {
  const g = await prisma.game.findFirst({
    where: { leagueId },
    orderBy: { dayNumber: "desc" },
    select: { dayNumber: true },
  });
  return g?.dayNumber ?? 0;
}

async function scheduleSeriesGame(
  leagueId: string,
  series: {
    id: string;
    round: string;
    highSeedTeamId: string;
    lowSeedTeamId: string;
    highWins: number;
    lowWins: number;
    bestOf: number;
  },
  day: number,
) {
  const gameIndex1 = series.highWins + series.lowWins + 1;
  const highHome = higherSeedHomeForGame(series.bestOf, gameIndex1);
  await prisma.game.create({
    data: {
      leagueId,
      homeTeamId: highHome ? series.highSeedTeamId : series.lowSeedTeamId,
      awayTeamId: highHome ? series.lowSeedTeamId : series.highSeedTeamId,
      dayNumber: day,
      round: series.round,
      seriesId: series.id,
    },
  });
}

/**
 * Seed the postseason from final regular-season standings and schedule the
 * first round's opening games. Returns false when there aren't enough teams.
 */
export async function startPlayoffs(leagueId: string): Promise<boolean> {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    orderBy: [{ wins: "desc" }, { runsFor: "desc" }],
  });
  const size = bracketSizeFor(teams.length);
  if (size < 2) return false;

  const names = roundNames(size);
  const round = names[0];
  const bestOf = bestOfFor(round);
  const seeds = teams.slice(0, size);

  const day = (await maxDay(leagueId)) + 1;
  const created: {
    id: string;
    round: string;
    highSeedTeamId: string;
    lowSeedTeamId: string;
    highWins: number;
    lowWins: number;
    bestOf: number;
  }[] = [];

  for (let i = 0; i < size / 2; i++) {
    const high = seeds[i];
    const low = seeds[size - 1 - i];
    const series = await prisma.playoffSeries.create({
      data: {
        leagueId,
        round,
        roundIndex: 0,
        slot: i,
        highSeedTeamId: high.id,
        lowSeedTeamId: low.id,
        highSeed: i + 1,
        lowSeed: size - i,
        bestOf,
      },
    });
    created.push({
      id: series.id,
      round,
      highSeedTeamId: high.id,
      lowSeedTeamId: low.id,
      highWins: 0,
      lowWins: 0,
      bestOf,
    });
  }

  for (const s of created) await scheduleSeriesGame(leagueId, s, day);

  await prisma.league.update({
    where: { id: leagueId },
    data: { status: "playoffs" },
  });
  return true;
}

async function recordChampion(leagueId: string, winnerTeamId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  const champ = await prisma.team.findUnique({ where: { id: winnerTeamId } });
  if (!league || !champ) return;

  // Runner-up = the team the champion beat in the Final
  const finalSeries = await prisma.playoffSeries.findFirst({
    where: { leagueId, round: "Final", done: true },
  });
  let runnerUp = "";
  if (finalSeries) {
    const loserId =
      finalSeries.winnerTeamId === finalSeries.highSeedTeamId
        ? finalSeries.lowSeedTeamId
        : finalSeries.highSeedTeamId;
    const loser = await prisma.team.findUnique({ where: { id: loserId } });
    runnerUp = loser?.name ?? "";
  }

  await prisma.champion.create({
    data: {
      leagueId,
      seasonNumber: league.seasonNumber,
      teamId: champ.id,
      teamName: champ.name,
      teamAbbr: champ.abbreviation,
      runnerUpName: runnerUp,
      note: `${champ.wins}-${champ.losses} regular season`,
    },
  });

  await prisma.league.update({
    where: { id: leagueId },
    data: { status: "complete" },
  });
}

/**
 * Called after a postseason day is fully played: tallies series, clinches
 * winners, then schedules the next games or advances the bracket. Crowns a
 * champion when the Final is decided.
 */
export async function advancePlayoffs(leagueId: string): Promise<void> {
  const activeRoundAgg = await prisma.playoffSeries.findFirst({
    where: { leagueId, done: false },
    orderBy: { roundIndex: "asc" },
    select: { roundIndex: true },
  });
  if (!activeRoundAgg) return;
  const roundIndex = activeRoundAgg.roundIndex;

  const series = await prisma.playoffSeries.findMany({
    where: { leagueId, roundIndex },
    orderBy: { slot: "asc" },
  });

  // Tally each series from its final games and clinch
  for (const s of series) {
    if (s.done) continue;
    const games = await prisma.game.findMany({
      where: { seriesId: s.id, status: "final" },
    });
    let highWins = 0;
    let lowWins = 0;
    for (const g of games) {
      const homeWon = g.homeScore > g.awayScore;
      const winnerId = homeWon ? g.homeTeamId : g.awayTeamId;
      if (winnerId === s.highSeedTeamId) highWins += 1;
      else if (winnerId === s.lowSeedTeamId) lowWins += 1;
    }
    const need = winsNeeded(s.bestOf);
    const done = highWins >= need || lowWins >= need;
    const winnerTeamId = highWins >= need
      ? s.highSeedTeamId
      : lowWins >= need
        ? s.lowSeedTeamId
        : null;
    await prisma.playoffSeries.update({
      where: { id: s.id },
      data: { highWins, lowWins, done, winnerTeamId },
    });
    s.highWins = highWins;
    s.lowWins = lowWins;
    s.done = done;
    s.winnerTeamId = winnerTeamId;
  }

  const roundComplete = series.every((s) => s.done);
  const day = (await maxDay(leagueId)) + 1;

  if (!roundComplete) {
    // Schedule the next game for every still-alive series
    for (const s of series) {
      if (s.done) continue;
      await scheduleSeriesGame(leagueId, s, day);
    }
    return;
  }

  // Round finished — build the next round or crown a champion
  const winners = series
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((s) => s.winnerTeamId!)
    .filter(Boolean);

  if (winners.length <= 1) {
    if (winners[0]) await recordChampion(leagueId, winners[0]);
    return;
  }

  const size = winners.length; // teams entering next round
  const names = roundNames(size * 2 >= 8 ? 8 : size * 2 >= 4 ? 4 : 2);
  // Next round name is chosen by how many teams remain
  const nextName =
    winners.length === 2
      ? "Final"
      : winners.length === 4
        ? "Semifinal"
        : names[0];
  const bestOf = bestOfFor(nextName);

  // Re-seed winners by their standing (wins) to pair high vs low
  const winnerTeams = await prisma.team.findMany({
    where: { id: { in: winners } },
    orderBy: [{ wins: "desc" }, { runsFor: "desc" }],
  });

  const created: {
    id: string;
    round: string;
    highSeedTeamId: string;
    lowSeedTeamId: string;
    highWins: number;
    lowWins: number;
    bestOf: number;
  }[] = [];

  for (let i = 0; i < winnerTeams.length / 2; i++) {
    const high = winnerTeams[i];
    const low = winnerTeams[winnerTeams.length - 1 - i];
    const s = await prisma.playoffSeries.create({
      data: {
        leagueId,
        round: nextName,
        roundIndex: roundIndex + 1,
        slot: i,
        highSeedTeamId: high.id,
        lowSeedTeamId: low.id,
        highSeed: i + 1,
        lowSeed: winnerTeams.length - i,
        bestOf,
      },
    });
    created.push({
      id: s.id,
      round: nextName,
      highSeedTeamId: high.id,
      lowSeedTeamId: low.id,
      highWins: 0,
      lowWins: 0,
      bestOf,
    });
  }

  for (const s of created) await scheduleSeriesGame(leagueId, s, day);
}
