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
import { MIN_PITCHERS, MIN_RELIEVERS, MIN_STARTERS, pitcherRole } from "./staff";

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
  durability: number;
  description: string;
};

async function loadEraPool(eraId: string): Promise<PoolPlayer[]> {
  const era = dynastyEraById(eraId);
  const eraWhere = dynastyEraPlayerWhere(era);
  const select = {
    id: true,
    name: true,
    isPitcher: true,
    salary: true,
    careerWAR: true,
    durability: true,
    description: true,
  } as const;

  // Stars by WAR + a deep cheap-arm slice so 5 SP + bullpen can finish under cap
  const [byWar, cheapArms, solidBats] = await Promise.all([
    prisma.player.findMany({
      where: eraWhere,
      orderBy: [{ careerWAR: "desc" }, { salary: "desc" }],
      take: 1000,
      select,
    }),
    prisma.player.findMany({
      where: { ...eraWhere, isPitcher: true },
      orderBy: [{ salary: "asc" }, { careerWAR: "desc" }],
      take: 1200,
      select,
    }),
    prisma.player.findMany({
      where: { ...eraWhere, isPitcher: false },
      orderBy: [{ salary: "asc" }, { careerWAR: "desc" }],
      take: 400,
      select,
    }),
  ]);

  const seen = new Set<string>();
  const merged: PoolPlayer[] = [];
  for (const p of [...byWar, ...cheapArms, ...solidBats]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
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

  // Construction: 9 hitters, then 5 SP + 3 RP (Randy can't start 162).
  const rosterPitchers = roster
    .filter((r) => r.player.isPitcher)
    .map((r) => r.player);
  const spCount = rosterPitchers.filter((p) => pitcherRole(p) === "SP").length;
  const rpCount = rosterPitchers.filter((p) => pitcherRole(p) === "RP").length;

  const forceHitter = hitters < 9;
  const forceStarter = !forceHitter && spCount < MIN_STARTERS;
  const forceReliever =
    !forceHitter && !forceStarter && rpCount < MIN_RELIEVERS;
  const forcePitcher =
    !forceHitter &&
    !forceStarter &&
    !forceReliever &&
    pitchers < MIN_PITCHERS;
  const building =
    forceHitter || forceStarter || forceReliever || forcePitcher;
  // Keep powder dry until the full 5 SP + 3 RP are rostered
  const reserve = forceStarter
    ? 20_000_000
    : forceReliever
      ? 8_000_000
      : building
        ? 4_000_000
        : 10_000_000;

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
    if (forceStarter) {
      return p.isPitcher && pitcherRole(p) === "SP";
    }
    if (forceReliever) {
      return p.isPitcher && pitcherRole(p) === "RP";
    }
    if (forcePitcher && !p.isPitcher) return false;
    return true;
  };

  const pickFrom = (softReserve: number, enforceRole: boolean) => {
    // During rotation/pen construction, stay mid-tier so cap room remains
    // for all 5 SP + bullpen (no $32M Randy-then-broke roster).
    const softCap = forceStarter
      ? 9_000_000
      : forceReliever
        ? 6_000_000
        : building
          ? 10_000_000
          : 18_000_000;
    const candidates = pool
      .filter((p) => fitsCaps(p, softReserve) && (!enforceRole || roleOk(p)))
      .sort((a, b) => {
        if (building) {
          const ea = efficiency(a) - a.salary / 25_000_000;
          const eb = efficiency(b) - b.salary / 25_000_000;
          return eb - ea;
        }
        return efficiency(b) - efficiency(a);
      });
    return (
      candidates.find((p) => p.salary <= softCap) ?? candidates[0] ?? null
    );
  };

  const anyPitcher = (softReserve: number) => {
    const candidates = pool
      .filter((p) => p.isPitcher && fitsCaps(p, softReserve))
      .sort((a, b) => efficiency(b) - efficiency(a));
    return candidates[0] ?? null;
  };

  const cheapestPitcher = () =>
    pool
      .filter(
        (p) =>
          p.isPitcher &&
          !takenSet.has(p.id) &&
          payroll + p.salary <= salaryCap &&
          pitchers < 11,
      )
      .sort(
        (a, b) => a.salary - b.salary || b.careerWAR - a.careerWAR,
      )[0] ?? null;

  const pick =
    pickFrom(reserve, true) ??
    pickFrom(0, true) ??
    // If the SP/RP pool is thin under the cap, still take an arm — never a bat
    (forceStarter || forceReliever || forcePitcher
      ? anyPitcher(0)
      : null) ??
    (building ? cheapestPitcher() : null) ??
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
  let pool: PoolPlayer[] | undefined;
  const takenSet = new Set(
    (
      await prisma.rosterSpot.findMany({
        where: { leagueId },
        select: { playerId: true },
      })
    ).map((t) => t.playerId),
  );

  for (let i = 0; i < maxPicks; i++) {
    const state = await getDraftState(leagueId);
    if (state.complete) {
      await topUpPitching(
        leagueId,
        state.league.era,
        state.league.salaryCap,
      );
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

    pool = pool ?? (await loadEraPool(state.league.era));
    const pick = await pickBpaForTeam({
      leagueId,
      teamId: state.onClock.id,
      eraId: state.league.era,
      salaryCap: state.league.salaryCap,
      seed: state.pickNumber + 3,
      pool,
      takenSet,
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
    await topUpPitching(leagueId, after.league.era, after.league.salaryCap);
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

/** If a team finished short on arms, free cap (cut fringe bats) and add cheap pitchers. */
async function topUpPitching(leagueId: string, eraId: string, salaryCap: number) {
  const era = dynastyEraById(eraId);
  const cheapArms = await prisma.player.findMany({
    where: { ...dynastyEraPlayerWhere(era), isPitcher: true },
    orderBy: [{ salary: "asc" }, { careerWAR: "desc" }],
    take: 2000,
  });
  const teams = await prisma.team.findMany({
    where: { leagueId },
    include: { roster: { include: { player: true } } },
  });
  const taken = new Set(
    teams.flatMap((t) => t.roster.map((r) => r.playerId)),
  );

  for (const team of teams) {
    let roster = [...team.roster];
    let guard = 0;
    while (guard++ < 30) {
      const pitcherCount = roster.filter((r) => r.player.isPitcher).length;
      if (pitcherCount >= MIN_PITCHERS) break;

      let payroll = roster.reduce((s, r) => s + r.player.salary, 0);
      let next = cheapArms.find(
        (p) => !taken.has(p.id) && payroll + p.salary <= salaryCap,
      );

      if (!next) {
        // Free cap: cut the priciest expendable player (keep 9H / 5P floors)
        const hCount = roster.filter((r) => !r.player.isPitcher).length;
        const pCount = roster.filter((r) => r.player.isPitcher).length;
        const cuttable = roster
          .filter((r) =>
            r.player.isPitcher ? pCount > 5 : hCount > 9,
          )
          .sort(
            (a, b) =>
              b.player.salary - a.player.salary ||
              (a.player.careerWAR ?? 0) - (b.player.careerWAR ?? 0),
          );
        // If locked at 9H/5+P, still cut the lowest-WAR starter to rebuild the pen
        const cut =
          cuttable[0] ??
          roster
            .filter((r) => r.player.isPitcher)
            .sort(
              (a, b) =>
                (a.player.careerWAR ?? 0) - (b.player.careerWAR ?? 0) ||
                b.player.salary - a.player.salary,
            )[0];
        if (!cut) break;
        await prisma.rosterSpot.deleteMany({
          where: { teamId: team.id, playerId: cut.playerId },
        });
        taken.delete(cut.playerId);
        roster = roster.filter((r) => r.playerId !== cut.playerId);
        continue;
      }

      await prisma.rosterSpot.create({
        data: { teamId: team.id, playerId: next.id, leagueId },
      });
      taken.add(next.id);
      roster.push({
        id: "tmp",
        leagueId,
        teamId: team.id,
        playerId: next.id,
        player: next,
      } as (typeof roster)[number]);
    }
  }
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

  await topUpPitching(leagueId, boot.league.era, boot.league.salaryCap);

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
