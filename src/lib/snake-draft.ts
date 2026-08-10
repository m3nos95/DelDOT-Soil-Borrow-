/**
 * Live snake-draft engine: turn checks, exclusive claims, CPU auto-picks.
 */
import { prisma } from "./db";
import {
  draftRound,
  isDraftComplete,
  teamIndexOnClock,
  totalDraftPicks,
} from "./draft";
import {
  dynastyEraById,
  dynastyEraPlayerWhere,
} from "./environment";
import { ensureDefaultLineup } from "./league";

type TeamRow = {
  id: string;
  draftOrder: number;
  isCpu: boolean;
  draftReady: boolean;
  abbreviation: string;
  name: string;
};

export async function reassignDraftOrders(leagueId: string) {
  const teams = await prisma.team.findMany({
    where: { leagueId },
    orderBy: [{ createdAt: "asc" }, { abbreviation: "asc" }],
  });
  for (let i = 0; i < teams.length; i++) {
    if (teams[i].draftOrder !== i) {
      await prisma.team.update({
        where: { id: teams[i].id },
        data: { draftOrder: i },
      });
    }
  }
  return teams.length;
}

export async function getDraftState(leagueId: string) {
  const league = await prisma.league.findUniqueOrThrow({
    where: { id: leagueId },
    include: {
      teams: {
        orderBy: { draftOrder: "asc" },
        include: {
          owner: true,
          roster: { select: { id: true } },
        },
      },
    },
  });

  const teams = league.teams;
  const numTeams = teams.length;
  const rounds = league.draftRounds;
  const pickNumber = league.draftPickNumber;
  const complete = isDraftComplete(pickNumber, numTeams, rounds);
  const onClockIdx = complete ? -1 : teamIndexOnClock(pickNumber, numTeams);
  const onClock = onClockIdx >= 0 ? teams[onClockIdx] ?? null : null;
  const total = totalDraftPicks(numTeams, rounds);

  return {
    league,
    teams,
    numTeams,
    rounds,
    pickNumber,
    complete,
    onClock,
    onClockIdx,
    totalPicks: total,
    round: complete ? rounds : draftRound(pickNumber, numTeams),
    pickInRound: complete ? numTeams : (pickNumber % numTeams) + 1,
  };
}

type PoolPlayer = {
  id: string;
  name: string;
  isPitcher: boolean;
  salary: number;
  careerWAR: number;
};

async function loadEraPool(eraId: string): Promise<PoolPlayer[]> {
  const era = dynastyEraById(eraId);
  return prisma.player.findMany({
    where: dynastyEraPlayerWhere(era),
    orderBy: [{ careerWAR: "desc" }, { salary: "desc" }],
    take: 1200,
    select: {
      id: true,
      name: true,
      isPitcher: true,
      salary: true,
      careerWAR: true,
    },
  });
}

async function pickBpaForTeam(opts: {
  leagueId: string;
  teamId: string;
  eraId: string;
  salaryCap: number;
  seed?: number;
  pool?: PoolPlayer[];
  takenSet?: Set<string>;
}) {
  const { leagueId, teamId, eraId, salaryCap, seed = 1 } = opts;
  const roster = await prisma.rosterSpot.findMany({
    where: { teamId },
    include: { player: true },
  });
  let payroll = roster.reduce((s, r) => s + r.player.salary, 0);
  let hitters = roster.filter((r) => !r.player.isPitcher).length;
  let pitchers = roster.filter((r) => r.player.isPitcher).length;

  if (roster.length >= 25) return null;

  const takenSet =
    opts.takenSet ??
    new Set(
      (
        await prisma.rosterSpot.findMany({
          where: { leagueId },
          select: { playerId: true },
        })
      ).map((t) => t.playerId),
    );

  const pool = opts.pool ?? (await loadEraPool(eraId));

  // Construction: lineup needs 9 hitters; staff needs arms.
  // Fill bats to 9, then arms to 6, then best available under cap.
  const forceHitter = hitters < 9;
  const forcePitcher = !forceHitter && pitchers < 6;
  const building = forceHitter || forcePitcher;
  const reserve = building ? 2_000_000 : 10_000_000;

  const efficiency = (p: PoolPlayer) =>
    p.careerWAR / Math.max(1, p.salary / 1_000_000) +
    ((p.name.charCodeAt(0) + seed) % 7) * 0.01;

  const fitsCaps = (p: PoolPlayer, softReserve: number) => {
    if (takenSet.has(p.id)) return false;
    if (payroll + p.salary > salaryCap - softReserve) return false;
    if (!p.isPitcher && hitters >= 14) return false;
    if (p.isPitcher && pitchers >= 11) return false;
    return true;
  };

  const roleOk = (p: PoolPlayer) => {
    if (forceHitter && p.isPitcher) return false;
    if (forcePitcher && !p.isPitcher) return false;
    return true;
  };

  const pickFrom = (softReserve: number, enforceRole: boolean) => {
    const candidates = pool
      .filter((p) => fitsCaps(p, softReserve) && (!enforceRole || roleOk(p)))
      .sort((a, b) => {
        // While building, prefer affordable value over max WAR stars
        if (building) {
          const ea = efficiency(a) - a.salary / 40_000_000;
          const eb = efficiency(b) - b.salary / 40_000_000;
          return eb - ea;
        }
        return efficiency(b) - efficiency(a);
      });
    return (
      candidates.find((p) => p.salary <= (building ? 10_000_000 : 18_000_000)) ??
      candidates[0] ??
      null
    );
  };

  const pick =
    pickFrom(reserve, true) ??
    pickFrom(0, true) ??
    pickFrom(0, false);
  if (!pick) return null;

  try {
    await prisma.rosterSpot.create({
      data: { teamId, playerId: pick.id, leagueId },
    });
  } catch {
    return null;
  }
  takenSet.add(pick.id);
  return pick;
}

async function markDraftComplete(leagueId: string, teams: TeamRow[]) {
  for (const t of teams) {
    await ensureDefaultLineup(t.id);
    if (!t.draftReady) {
      await prisma.team.update({
        where: { id: t.id },
        data: { draftReady: true },
      });
    }
  }
}

/**
 * Make CPU picks while a CPU team is on the clock.
 * Stops when a human is on the clock or the draft is done.
 */
export async function advanceCpuPicks(leagueId: string, maxPicks = 40) {
  let made = 0;
  for (let i = 0; i < maxPicks; i++) {
    const state = await getDraftState(leagueId);
    if (state.complete) {
      await markDraftComplete(
        leagueId,
        state.teams.map((t) => ({
          id: t.id,
          draftOrder: t.draftOrder,
          isCpu: t.isCpu,
          draftReady: t.draftReady,
          abbreviation: t.abbreviation,
          name: t.name,
        })),
      );
      break;
    }
    if (!state.onClock?.isCpu) break;

    const pick = await pickBpaForTeam({
      leagueId,
      teamId: state.onClock.id,
      eraId: state.league.era,
      salaryCap: state.league.salaryCap,
      seed: state.pickNumber + 3,
    });
    if (!pick) {
      // Skip stuck CPU slot so the draft cannot hang forever
      await prisma.league.update({
        where: { id: leagueId },
        data: { draftPickNumber: state.pickNumber + 1 },
      });
      made += 1;
      continue;
    }

    await prisma.league.update({
      where: { id: leagueId },
      data: { draftPickNumber: state.pickNumber + 1 },
    });
    made += 1;
  }

  const after = await getDraftState(leagueId);
  if (after.complete) {
    await markDraftComplete(
      leagueId,
      after.teams.map((t) => ({
        id: t.id,
        draftOrder: t.draftOrder,
        isCpu: t.isCpu,
        draftReady: t.draftReady,
        abbreviation: t.abbreviation,
        name: t.name,
      })),
    );
  }
  return { made, complete: after.complete, onClock: after.onClock };
}

/** Test/seed helper: snake-draft BPA for every remaining pick. */
export async function runSnakeDraftToCompletion(leagueId: string) {
  await reassignDraftOrders(leagueId);
  const boot = await getDraftState(leagueId);
  const pool = await loadEraPool(boot.league.era);
  const takenSet = new Set(
    (
      await prisma.rosterSpot.findMany({
        where: { leagueId },
        select: { playerId: true },
      })
    ).map((t) => t.playerId),
  );

  let guard = 0;
  while (guard++ < 2000) {
    const state = await getDraftState(leagueId);
    if (state.complete) break;
    if (!state.onClock) break;

    const pick = await pickBpaForTeam({
      leagueId,
      teamId: state.onClock.id,
      eraId: state.league.era,
      salaryCap: state.league.salaryCap,
      seed: state.pickNumber + (state.onClock.isCpu ? 3 : 1),
      pool,
      takenSet,
    });
    if (!pick) {
      await prisma.league.update({
        where: { id: leagueId },
        data: { draftPickNumber: state.pickNumber + 1 },
      });
      continue;
    }
    await prisma.league.update({
      where: { id: leagueId },
      data: { draftPickNumber: state.pickNumber + 1 },
    });
  }
  const final = await getDraftState(leagueId);
  if (!final.complete) {
    await prisma.league.update({
      where: { id: leagueId },
      data: {
        draftPickNumber: totalDraftPicks(final.numTeams, final.rounds),
      },
    });
  }
  const done = await getDraftState(leagueId);
  await markDraftComplete(
    leagueId,
    done.teams.map((t) => ({
      id: t.id,
      draftOrder: t.draftOrder,
      isCpu: t.isCpu,
      draftReady: t.draftReady,
      abbreviation: t.abbreviation,
      name: t.name,
    })),
  );
}
