import { customAlphabet } from "nanoid";
import { prisma } from "./db";
import type { Hand, SimPlayer, LineupEntry, StaffArm, BullpenRole } from "./sim";
import { deriveSpeed, simulateGame } from "./sim";

export { PARKS } from "./constants";

// Avoid ambiguous glyphs (I/1/O/0/W/H lookalike pairs in some fonts)
const inviteAlphabet = customAlphabet("ABCDEFGJKMNPQRTUVXY23456789", 6);

export function generateInviteCode() {
  return inviteAlphabet();
}

export async function getLeaguePayroll(teamId: string) {
  const spots = await prisma.rosterSpot.findMany({
    where: { teamId },
    include: { player: true },
  });
  return spots.reduce((sum, s) => sum + s.player.salary, 0);
}

export async function draftedPlayerIds(leagueId: string) {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    include: { roster: true },
  });
  return new Set(teams.flatMap((t) => t.roster.map((r) => r.playerId)));
}

function asHand(v: string | null | undefined, fallback: Hand = "R"): Hand {
  if (v === "L" || v === "R" || v === "S") return v;
  return fallback;
}

function toSimPlayer(p: {
  id: string;
  name: string;
  primaryPos: string;
  isPitcher: boolean;
  bats?: string;
  throws?: string;
  kRate: number;
  bbRate: number;
  hbpRate: number;
  singleRate: number;
  doubleRate: number;
  tripleRate: number;
  hrRate: number;
  stuff: number;
  control: number;
  durability?: number;
}): SimPlayer {
  return {
    id: p.id,
    name: p.name,
    primaryPos: p.primaryPos,
    isPitcher: p.isPitcher,
    bats: asHand(p.bats),
    throws: asHand(p.throws),
    kRate: p.kRate,
    bbRate: p.bbRate,
    hbpRate: p.hbpRate,
    singleRate: p.singleRate,
    doubleRate: p.doubleRate,
    tripleRate: p.tripleRate,
    hrRate: p.hrRate,
    stuff: p.stuff,
    control: p.control,
    durability: p.durability ?? 50,
    speed: deriveSpeed(p),
  };
}

function roleFromStaff(role: string): BullpenRole {
  if (role.startsWith("SP")) return "SP";
  if (role === "CL") return "CL";
  if (role.startsWith("SU")) return "SU";
  if (role === "LR") return "LR";
  return "MU";
}

export async function ensureDefaultLineup(teamId: string) {
  const roster = await prisma.rosterSpot.findMany({
    where: { teamId },
    include: { player: true },
  });
  const hitters = roster
    .map((r) => r.player)
    .filter((p) => !p.isPitcher)
    .sort((a, b) => b.salary - a.salary);
  const pitchers = roster
    .map((r) => r.player)
    .filter((p) => p.isPitcher)
    .sort((a, b) => b.salary - a.salary);

  const existingLineup = await prisma.lineupSlot.count({ where: { teamId } });
  if (existingLineup < 9 && hitters.length >= 9) {
    await prisma.lineupSlot.deleteMany({ where: { teamId } });
    const orderPrefs = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
    const used = new Set<string>();
    const slots: { playerId: string; battingOrder: number; position: string }[] =
      [];

    for (const pos of orderPrefs) {
      const pick =
        hitters.find(
          (h) =>
            !used.has(h.id) &&
            (h.primaryPos === pos || h.positions.split(",").includes(pos)),
        ) ?? hitters.find((h) => !used.has(h.id));
      if (!pick) continue;
      used.add(pick.id);
      slots.push({
        playerId: pick.id,
        battingOrder: slots.length + 1,
        position: pos,
      });
    }

    if (slots.length) {
      await prisma.lineupSlot.createMany({
        data: slots.map((s) => ({ ...s, teamId })),
      });
    }
  }

  const staffCount = await prisma.staffSlot.count({ where: { teamId } });
  if (staffCount === 0 && pitchers.length > 0) {
    const roles = ["SP1", "SP2", "SP3", "SP4", "SP5", "CL", "SU1", "SU2", "LR"];
    const staff = pitchers.slice(0, roles.length).map((p, i) => ({
      teamId,
      playerId: p.id,
      role: roles[i],
    }));
    await prisma.staffSlot.createMany({ data: staff });
  }
}

export function buildRoundRobin(teamIds: string[], gamesPerTeam: number) {
  if (teamIds.length < 2) return [] as { homeTeamId: string; awayTeamId: string; dayNumber: number }[];

  const pairs: { home: string; away: string }[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push({ home: teamIds[i], away: teamIds[j] });
      pairs.push({ home: teamIds[j], away: teamIds[i] });
    }
  }

  const targetGames = Math.ceil((gamesPerTeam * teamIds.length) / 2);
  const schedule: { homeTeamId: string; awayTeamId: string; dayNumber: number }[] =
    [];
  let day = 1;
  let cursor = 0;
  const gamesToday = new Set<string>();

  while (schedule.length < targetGames) {
    let placed = false;
    for (let attempt = 0; attempt < pairs.length; attempt++) {
      const pair = pairs[cursor % pairs.length];
      cursor += 1;
      if (gamesToday.has(pair.home) || gamesToday.has(pair.away)) continue;
      schedule.push({
        homeTeamId: pair.home,
        awayTeamId: pair.away,
        dayNumber: day,
      });
      gamesToday.add(pair.home);
      gamesToday.add(pair.away);
      placed = true;
      if (gamesToday.size >= teamIds.length - (teamIds.length % 2)) break;
    }
    if (!placed || gamesToday.size >= Math.floor(teamIds.length / 2) * 2) {
      day += 1;
      gamesToday.clear();
    }
    if (day > gamesPerTeam * teamIds.length + 50) break;
  }

  return schedule;
}

export async function startSeason(leagueId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (!league || league.teams.length < 2) {
    throw new Error("Need at least 2 teams to start");
  }
  if (!league.teams.every((t) => t.draftReady)) {
    throw new Error("All teams must mark draft ready");
  }

  for (const team of league.teams) {
    await ensureDefaultLineup(team.id);
  }

  const games = buildRoundRobin(
    league.teams.map((t) => t.id),
    league.gamesPerTeam,
  );

  await prisma.game.createMany({
    data: games.map((g) => ({
      leagueId,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      dayNumber: g.dayNumber,
    })),
  });

  await prisma.league.update({
    where: { id: leagueId },
    data: { status: "season" },
  });
}

async function loadTeamSimParts(teamId: string, dayNumber: number) {
  const lineup = await prisma.lineupSlot.findMany({
    where: { teamId },
    include: { player: true },
    orderBy: { battingOrder: "asc" },
  });
  if (lineup.length < 9) {
    await ensureDefaultLineup(teamId);
  }
  const finalLineup = await prisma.lineupSlot.findMany({
    where: { teamId },
    include: { player: true },
    orderBy: { battingOrder: "asc" },
  });

  const staff = await prisma.staffSlot.findMany({
    where: { teamId },
    include: { player: true },
  });
  const rotation = ["SP1", "SP2", "SP3", "SP4", "SP5"]
    .map((role) => staff.find((s) => s.role === role))
    .filter(Boolean);
  const starterSlot =
    rotation.length > 0
      ? rotation[(dayNumber - 1) % rotation.length]
      : staff.find((s) => s.player.isPitcher);

  if (!starterSlot || finalLineup.length < 9) {
    throw new Error("Team is missing lineup or pitching staff");
  }

  const lineupEntries: LineupEntry[] = finalLineup.slice(0, 9).map((s) => ({
    player: toSimPlayer(s.player),
    battingOrder: s.battingOrder,
    position: s.position,
  }));

  const arms: StaffArm[] = [
    { player: toSimPlayer(starterSlot.player), role: "SP" },
  ];
  for (const slot of staff) {
    if (slot.playerId === starterSlot.playerId) continue;
    const role = roleFromStaff(slot.role);
    if (role === "SP") continue; // other starters sit this game
    arms.push({ player: toSimPlayer(slot.player), role });
  }

  // If pen is empty, scrape remaining roster pitchers as mop-up
  if (arms.length === 1) {
    const roster = await prisma.rosterSpot.findMany({
      where: { teamId },
      include: { player: true },
    });
    for (const spot of roster) {
      if (!spot.player.isPitcher) continue;
      if (spot.playerId === starterSlot.playerId) continue;
      if (arms.some((a) => a.player.id === spot.playerId)) continue;
      arms.push({ player: toSimPlayer(spot.player), role: "MU" });
      if (arms.length >= 6) break;
    }
  }

  return { lineupEntries, staff: arms, pitcher: toSimPlayer(starterSlot.player) };
}

export async function simulateScheduledGame(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!game) throw new Error("Game not found");
  if (game.status === "final") return game;

  const home = await loadTeamSimParts(game.homeTeamId, game.dayNumber);
  const away = await loadTeamSimParts(game.awayTeamId, game.dayNumber);

  const result = simulateGame({
    homeLineup: home.lineupEntries,
    awayLineup: away.lineupEntries,
    homeStaff: home.staff,
    awayStaff: away.staff,
    seed:
      game.dayNumber * 10007 +
      game.homeTeamId.charCodeAt(0) * 97 +
      game.awayTeamId.charCodeAt(0) * 13,
  });

  await prisma.$transaction([
    prisma.game.update({
      where: { id: gameId },
      data: {
        status: "final",
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        innings: JSON.stringify(result.innings),
        playByPlay: JSON.stringify(result.playByPlay),
        boxScore: JSON.stringify({
          home: result.homeBox,
          away: result.awayBox,
        }),
        homePitcher: result.homePitcher,
        awayPitcher: result.awayPitcher,
        playedAt: new Date(),
      },
    }),
    prisma.team.update({
      where: { id: game.homeTeamId },
      data: {
        wins: { increment: result.homeScore > result.awayScore ? 1 : 0 },
        losses: { increment: result.homeScore < result.awayScore ? 1 : 0 },
        runsFor: { increment: result.homeScore },
        runsAgainst: { increment: result.awayScore },
      },
    }),
    prisma.team.update({
      where: { id: game.awayTeamId },
      data: {
        wins: { increment: result.awayScore > result.homeScore ? 1 : 0 },
        losses: { increment: result.awayScore < result.homeScore ? 1 : 0 },
        runsFor: { increment: result.awayScore },
        runsAgainst: { increment: result.homeScore },
      },
    }),
  ]);

  const leagueGames = await prisma.game.count({
    where: { leagueId: game.leagueId, status: "scheduled" },
  });
  if (leagueGames === 0) {
    await prisma.league.update({
      where: { id: game.leagueId },
      data: { status: "complete" },
    });
  }

  return prisma.game.findUnique({ where: { id: gameId } });
}

export async function simulateNextDay(leagueId: string) {
  const next = await prisma.game.findFirst({
    where: { leagueId, status: "scheduled" },
    orderBy: [{ dayNumber: "asc" }, { id: "asc" }],
  });
  if (!next) return { simulated: 0, dayNumber: null as number | null };

  const dayNumber = next.dayNumber;
  const games = await prisma.game.findMany({
    where: { leagueId, status: "scheduled", dayNumber },
  });
  for (const g of games) {
    await simulateScheduledGame(g.id);
  }
  return { simulated: games.length, dayNumber };
}
