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
import { selectStrategicPick, type DraftCand } from "./draft-strategy";
import { MIN_PITCHERS, pitcherRole } from "./staff";

type TeamRow = {
  id: string;
  draftOrder: number;
  isCpu: boolean;
  draftReady: boolean;
  abbreviation: string;
  name: string;
};

/**
 * Assign draftOrder 0…N-1.
 * - shuffle: random lottery for round-1 order (only before pick 1)
 * - stable: keep current relative order, just renumber gaps
 *
 * Once draftPickNumber > 0, order is locked.
 */
export async function reassignDraftOrders(
  leagueId: string,
  mode: "stable" | "shuffle" = "stable",
) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return 0;
  if (league.draftPickNumber > 0) {
    return (
      await prisma.team.count({ where: { leagueId } })
    );
  }

  const teams = await prisma.team.findMany({
    where: { leagueId },
    orderBy: [{ draftOrder: "asc" }, { createdAt: "asc" }, { abbreviation: "asc" }],
  });

  if (mode === "shuffle") {
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = teams[i];
      teams[i] = teams[j];
      teams[j] = tmp;
    }
  }

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

type PoolPlayer = DraftCand;

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
    primaryPos: true,
    positions: true,
    stuff: true,
  } as const;

  // Stars by WAR + deep cheap slices so construction + late picks can finish
  const [byWar, cheapArms, cheapBats, midBats] = await Promise.all([
    prisma.player.findMany({
      where: eraWhere,
      orderBy: [{ careerWAR: "desc" }, { salary: "desc" }],
      take: 1500,
      select,
    }),
    prisma.player.findMany({
      where: { ...eraWhere, isPitcher: true },
      orderBy: [{ salary: "asc" }, { careerWAR: "desc" }],
      take: 1500,
      select,
    }),
    prisma.player.findMany({
      where: { ...eraWhere, isPitcher: false },
      orderBy: [{ salary: "asc" }, { careerWAR: "desc" }],
      take: 800,
      select,
    }),
    prisma.player.findMany({
      where: { ...eraWhere, isPitcher: false },
      orderBy: [{ careerWAR: "desc" }],
      take: 800,
      select,
    }),
  ]);

  const seen = new Set<string>();
  const merged: PoolPlayer[] = [];
  for (const p of [...byWar, ...midBats, ...cheapArms, ...cheapBats]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  return merged;
}

export async function pickBpaForTeam(opts: {
  leagueId: string;
  teamId: string;
  eraId: string;
  salaryCap: number;
  draftRounds?: number;
  seed?: number;
  pool?: PoolPlayer[];
  takenSet?: Set<string>;
}) {
  const { leagueId, teamId, eraId, salaryCap, seed = 1 } = opts;
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  const draftRounds = opts.draftRounds ?? league?.draftRounds ?? 22;

  const rosterRows = await prisma.rosterSpot.findMany({
    where: { teamId },
    include: { player: true },
  });
  const roster: DraftCand[] = rosterRows.map((r) => ({
    id: r.player.id,
    name: r.player.name,
    isPitcher: r.player.isPitcher,
    salary: r.player.salary,
    careerWAR: r.player.careerWAR,
    durability: r.player.durability,
    description: r.player.description,
    primaryPos: r.player.primaryPos,
    positions: r.player.positions,
    stuff: r.player.stuff,
  }));
  const payroll = roster.reduce((s, p) => s + p.salary, 0);

  if (roster.length >= draftRounds || roster.length >= 25) return null;

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

  // Retry a few times if another team snagged the player mid-pick
  for (let attempt = 0; attempt < 6; attempt++) {
    const pick = selectStrategicPick({
      roster,
      pool,
      taken: takenSet,
      payroll,
      salaryCap,
      draftRounds,
      seed: seed + attempt * 17,
    });
    if (!pick) return null;

    try {
      await prisma.rosterSpot.create({
        data: { teamId, playerId: pick.id, leagueId },
      });
      takenSet.add(pick.id);
      return pick;
    } catch {
      // League exclusivity race / stale taken set — refresh and retry
      takenSet.add(pick.id);
      const live = await prisma.rosterSpot.findMany({
        where: { leagueId },
        select: { playerId: true },
      });
      for (const row of live) takenSet.add(row.playerId);
    }
  }
  return null;
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
 * Pass a shared `takenSet` when chaining with human auto-draft so exclusivity stays live.
 */
export async function advanceCpuPicks(
  leagueId: string,
  maxPicks = 40,
  sharedTaken?: Set<string>,
) {
  let made = 0;
  let pool: PoolPlayer[] | undefined;
  const takenSet =
    sharedTaken ??
    new Set(
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
    while (guard++ < 40) {
      const arms = roster.filter((r) => r.player.isPitcher);
      const sps = arms.filter((r) => pitcherRole(r.player) === "SP");
      const rps = arms.filter((r) => pitcherRole(r.player) === "RP");
      const needSp = Math.max(0, 5 - sps.length);
      const needRp = Math.max(0, 3 - rps.length);
      if (needSp + needRp === 0 && arms.length >= MIN_PITCHERS) break;

      const wantRp = needRp > 0 && (needSp === 0 || rps.length < needSp);
      let payroll = roster.reduce((s, r) => s + r.player.salary, 0);
      let next = cheapArms.find((p) => {
        if (taken.has(p.id)) return false;
        if (payroll + p.salary > salaryCap) return false;
        const role = pitcherRole(p);
        if (wantRp) return role === "RP";
        if (needSp > 0) return role === "SP";
        return true;
      });
      // Fallback: any affordable arm if role filter found nothing
      if (!next) {
        next = cheapArms.find(
          (p) => !taken.has(p.id) && payroll + p.salary <= salaryCap,
        );
      }

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
        // Prefer cutting extra SP when we're short on RP
        const cut =
          (needRp > 0
            ? cuttable.find((r) => pitcherRole(r.player) === "SP")
            : undefined) ??
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
  await reassignDraftOrders(leagueId, "stable");
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

/**
 * Auto-draft for a human team until their roster hits draftRounds (or the
 * whole snake finishes). Uses strategic picks; never burns a turn empty.
 * Pauses only if another human is on the clock.
 */
export async function autoDraftHumanTeam(opts: {
  leagueId: string;
  teamId: string;
}) {
  const { leagueId, teamId } = opts;
  const league = await prisma.league.findUniqueOrThrow({
    where: { id: leagueId },
  });
  const pool = await loadEraPool(league.era);
  const takenSet = new Set(
    (
      await prisma.rosterSpot.findMany({
        where: { leagueId },
        select: { playerId: true },
      })
    ).map((t) => t.playerId),
  );

  let picks = 0;
  let stuckStreak = 0;
  for (let i = 0; i < 800; i++) {
    // Share takenSet so CPU exclusivity stays in sync with human auto-draft
    await advanceCpuPicks(leagueId, 40, takenSet);
    const state = await getDraftState(leagueId);

    const mySpots = await prisma.rosterSpot.count({ where: { teamId } });
    if (mySpots >= state.rounds) {
      // Still advance the rest of the board so the draft can complete
      await advanceCpuPicks(leagueId, 200, takenSet);
      const done = await getDraftState(leagueId);
      return { picks, complete: done.complete, rosterSize: mySpots };
    }

    if (state.complete) {
      return { picks, complete: true as const, rosterSize: mySpots };
    }
    if (!state.onClock) {
      return {
        picks,
        complete: false as const,
        waitingOn: null,
        rosterSize: mySpots,
      };
    }
    if (state.onClock.id !== teamId) {
      if (state.onClock.isCpu) continue;
      return {
        picks,
        complete: false as const,
        waitingOn: state.onClock.abbreviation,
        rosterSize: mySpots,
      };
    }

    const pick = await pickBpaForTeam({
      leagueId,
      teamId,
      eraId: state.league.era,
      salaryCap: state.league.salaryCap,
      draftRounds: state.rounds,
      seed: state.pickNumber + 11 + picks,
      pool,
      takenSet,
    });
    if (!pick) {
      // Refresh taken from DB and retry once before declaring stuck
      stuckStreak += 1;
      const live = await prisma.rosterSpot.findMany({
        where: { leagueId },
        select: { playerId: true },
      });
      for (const row of live) takenSet.add(row.playerId);
      if (stuckStreak < 3) continue;
      return {
        picks,
        complete: false as const,
        waitingOn: null,
        rosterSize: mySpots,
        stuck: true as const,
      };
    }
    stuckStreak = 0;
    picks += 1;
    await prisma.league.update({
      where: { id: leagueId },
      data: { draftPickNumber: state.pickNumber + 1 },
    });
  }

  const after = await getDraftState(leagueId);
  const rosterSize = await prisma.rosterSpot.count({ where: { teamId } });
  return { picks, complete: after.complete, rosterSize };
}


