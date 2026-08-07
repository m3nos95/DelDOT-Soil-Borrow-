import bcrypt from "bcryptjs";
import { prisma } from "./db";
import {
  dynastyEraById,
  dynastyEraPlayerWhere,
  playerInDynastyEra,
} from "./environment";
import { FRANCHISES } from "./franchises";
import {
  assessNeeds,
  evaluateTradeForTeam,
  findMutualTrade,
  pickCutCandidates,
  pickFreeAgentTarget,
  type GmPlayer,
} from "./gm";
import { draftedPlayerIds, ensureDefaultLineup, getLeaguePayroll } from "./league";
import { executeTrade } from "./trades";

const CPU_USERNAME = "__hardball_cpu__";

export async function ensureCpuUser() {
  const existing = await prisma.user.findUnique({
    where: { username: CPU_USERNAME },
  });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      username: CPU_USERNAME,
      displayName: "CPU",
      passwordHash: await bcrypt.hash(
        `cpu-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        10,
      ),
    },
  });
}

function toGm(p: {
  id: string;
  name: string;
  primaryPos: string;
  positions: string;
  isPitcher: boolean;
  salary: number;
  careerWAR: number;
  stuff: number;
  durability: number;
}): GmPlayer {
  return {
    id: p.id,
    name: p.name,
    primaryPos: p.primaryPos,
    positions: p.positions,
    isPitcher: p.isPitcher,
    salary: p.salary,
    careerWAR: p.careerWAR,
    stuff: p.stuff,
    durability: p.durability,
  };
}

async function loadTeamGm(teamId: string): Promise<GmPlayer[]> {
  const spots = await prisma.rosterSpot.findMany({
    where: { teamId },
    include: { player: true },
  });
  return spots.map((s) => toGm(s.player));
}

/** Smart auto-draft: fill construction first, then best available under cap. */
export async function autoDraftTeam(teamId: string, seed = 1) {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    include: { league: true, roster: true },
  });
  if (team.roster.length >= 20) {
    await ensureDefaultLineup(teamId);
    await prisma.team.update({
      where: { id: teamId },
      data: { draftReady: true },
    });
    return;
  }

  const era = dynastyEraById(team.league.era);
  const eraWhere = dynastyEraPlayerWhere(era);
  const taken = await draftedPlayerIds(team.leagueId);
  const pool = await prisma.player.findMany({
    where: eraWhere,
    orderBy: [{ careerWAR: "desc" }, { salary: "desc" }],
  });

  let payroll = await getLeaguePayroll(teamId);
  let hitters = (
    await prisma.rosterSpot.findMany({
      where: { teamId, player: { isPitcher: false } },
    })
  ).length;
  let pitchers = (
    await prisma.rosterSpot.findMany({
      where: { teamId, player: { isPitcher: true } },
    })
  ).length;

  const take = async (p: (typeof pool)[number]) => {
    await prisma.rosterSpot.create({ data: { teamId, playerId: p.id } });
    taken.add(p.id);
    payroll += p.salary;
    if (p.isPitcher) pitchers += 1;
    else hitters += 1;
  };

  const available = (reserve = 0) =>
    pool.filter((p) => {
      if (taken.has(p.id)) return false;
      if (payroll + p.salary > team.league.salaryCap - reserve) return false;
      if (!p.isPitcher && hitters >= 14) return false;
      if (p.isPitcher && pitchers >= 11) return false;
      if (hitters + pitchers >= 25) return false;
      return true;
    });

  const efficiency = (p: (typeof pool)[number]) =>
    p.careerWAR / Math.max(1, p.salary / 1_000_000) +
    ((p.name.charCodeAt(0) + seed) % 7) * 0.01;

  // Phase 1: construction minimums — affordable efficiency, leave cap room
  while (hitters < 10 || pitchers < 6) {
    const wantPitcher = pitchers < 6 && (hitters >= 10 || pitchers <= hitters);
    const reserve = Math.max(0, (16 - hitters - pitchers) * 1_500_000);
    const cand = available(reserve)
      .filter((p) => p.isPitcher === wantPitcher)
      .filter((p) => p.salary <= 12_000_000)
      .sort((a, b) => efficiency(b) - efficiency(a))[0]
      ?? available(0)
        .filter((p) => p.isPitcher === wantPitcher)
        .sort((a, b) => a.salary - b.salary || b.careerWAR - a.careerWAR)[0];
    if (!cand) break;
    await take(cand);
  }

  // Phase 2: stars / needs-aware BPA — always keep ~$12M for FA/trades
  const CAP_POWDER = 12_000_000;
  for (let n = 0; n < 50; n++) {
    if (hitters + pitchers >= 22) break;
    const roster = await loadTeamGm(teamId);
    const needs = assessNeeds(roster);
    const topNeed = needs[0]?.slot;
    const reserve =
      hitters + pitchers < 16
        ? Math.max(CAP_POWDER, 18_000_000)
        : CAP_POWDER;
    const cands = available(reserve).sort((a, b) => {
      const fitA =
        topNeed &&
        (topNeed === "SP" || topNeed === "RP" ? a.isPitcher : !a.isPitcher)
          ? 12
          : 0;
      const fitB =
        topNeed &&
        (topNeed === "SP" || topNeed === "RP" ? b.isPitcher : !b.isPitcher)
          ? 12
          : 0;
      return b.careerWAR + fitB - (a.careerWAR + fitA);
    });
    const pick = cands[0];
    if (!pick) break;
    await take(pick);
  }

  if (hitters < 10 || pitchers < 6) {
    throw new Error(
      `CPU auto-draft underfilled ${team.abbreviation} (${hitters}H/${pitchers}P)`,
    );
  }

  await ensureDefaultLineup(teamId);
  await prisma.team.update({
    where: { id: teamId },
    data: { draftReady: true },
  });
}

/** Create CPU franchises for every empty slot up to maxTeams. */
export async function fillCpuTeams(leagueId: string) {
  const league = await prisma.league.findUniqueOrThrow({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (league.status !== "drafting" && league.status !== "forming") {
    throw new Error("Can only fill CPU teams before the season starts");
  }

  const cpuUser = await ensureCpuUser();
  const takenCodes = new Set(league.teams.map((t) => t.abbreviation));
  const open = FRANCHISES.filter((f) => !takenCodes.has(f.code));
  const need = league.maxTeams - league.teams.length;
  if (need <= 0) return { created: 0 };

  const created: string[] = [];
  for (let i = 0; i < need; i++) {
    const franchise = open[i];
    if (!franchise) break;
    const team = await prisma.team.create({
      data: {
        leagueId,
        ownerId: cpuUser.id,
        isCpu: true,
        name: franchise.name,
        abbreviation: franchise.code,
        park: franchise.park,
      },
    });
    await autoDraftTeam(team.id, i + 3);
    created.push(team.id);
  }
  return { created: created.length };
}

async function freeAgentPool(leagueId: string, eraId: string) {
  const era = dynastyEraById(eraId);
  const taken = await draftedPlayerIds(leagueId);
  const players = await prisma.player.findMany({
    where: dynastyEraPlayerWhere(era),
    orderBy: [{ careerWAR: "desc" }],
    take: 400,
  });
  return players.filter((p) => !taken.has(p.id)).map(toGm);
}

async function signPlayer(teamId: string, playerId: string) {
  await prisma.rosterSpot.create({ data: { teamId, playerId } });
}

async function cutPlayer(teamId: string, playerId: string) {
  await prisma.lineupSlot.deleteMany({ where: { teamId, playerId } });
  await prisma.staffSlot.deleteMany({ where: { teamId, playerId } });
  await prisma.rosterSpot.deleteMany({ where: { teamId, playerId } });
}

/** In-season CPU moves: cuts, FA, and mutual trades. */
export async function runCpuFrontOffice(leagueId: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (!league || league.status !== "season") return { fa: 0, trades: 0, cuts: 0 };

  const cpuTeams = league.teams.filter((t) => t.isCpu);
  if (!cpuTeams.length) return { fa: 0, trades: 0, cuts: 0 };

  let fa = 0;
  let trades = 0;
  let cuts = 0;

  // FA / cuts per CPU team
  for (const team of cpuTeams) {
    let roster = await loadTeamGm(team.id);
    let payroll = await getLeaguePayroll(team.id);
    const fas = await freeAgentPool(leagueId, league.era);

    // Cut fringe if full or over near-cap with a better FA available
    if (roster.length >= 24 || payroll > league.salaryCap * 0.97) {
      for (const cut of pickCutCandidates(roster, 2)) {
        const target = pickFreeAgentTarget({
          roster: roster.filter((p) => p.id !== cut.id),
          freeAgents: fas.filter(
            (p) => p.salary <= cut.salary + (league.salaryCap - payroll + cut.salary),
          ),
          salaryCap: league.salaryCap,
          payroll: payroll - cut.salary,
        });
        if (!target && roster.length < 25) continue;
        await cutPlayer(team.id, cut.id);
        cuts += 1;
        roster = roster.filter((p) => p.id !== cut.id);
        payroll -= cut.salary;
        if (target) {
          await signPlayer(team.id, target.id);
          fa += 1;
          roster = [...roster, target];
          payroll += target.salary;
        }
      }
    }

    const target = pickFreeAgentTarget({
      roster,
      freeAgents: await freeAgentPool(leagueId, league.era),
      salaryCap: league.salaryCap,
      payroll,
    });
    if (target && roster.length < 25) {
      await signPlayer(team.id, target.id);
      fa += 1;
      await ensureDefaultLineup(team.id);
    } else if (cuts > 0 || fa > 0) {
      await ensureDefaultLineup(team.id);
    }
  }

  // CPU–CPU swaps first; occasional fair offer to humans
  const allTeams = await prisma.team.findMany({ where: { leagueId } });
  for (let i = 0; i < cpuTeams.length; i++) {
    if (trades >= Math.max(1, Math.ceil(cpuTeams.length / 2))) break;
    const a = cpuTeams[i];
    for (const b of allTeams) {
      if (a.id === b.id) continue;
      const pending = await prisma.trade.findFirst({
        where: {
          leagueId,
          status: "pending",
          OR: [
            { proposerTeamId: a.id, partnerTeamId: b.id },
            { proposerTeamId: b.id, partnerTeamId: a.id },
          ],
        },
      });
      if (pending) continue;

      const deal = findMutualTrade({
        aRoster: await loadTeamGm(a.id),
        bRoster: await loadTeamGm(b.id),
        aPayroll: await getLeaguePayroll(a.id),
        bPayroll: await getLeaguePayroll(b.id),
        salaryCap: league.salaryCap,
      });
      if (!deal) continue;

      try {
        await executeTrade({
          leagueId,
          proposerTeamId: a.id,
          partnerTeamId: b.id,
          proposerPlayerIds: deal.aGive.map((p) => p.id),
          partnerPlayerIds: deal.bGive.map((p) => p.id),
          note: `CPU deal: ${deal.reason}`,
          autoAccept: b.isCpu,
        });
        trades += 1;
        break;
      } catch {
        /* skip illegal / duplicate */
      }
    }
  }

  return { fa, trades, cuts };
}

export async function evaluateIncomingTradeAsCpu(tradeId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      assets: { include: { player: true } },
      partnerTeam: { include: { league: true, roster: { include: { player: true } } } },
      proposerTeam: true,
      league: true,
    },
  });
  if (!trade || trade.status !== "pending") {
    return { accept: false, reason: "Trade unavailable" };
  }
  if (!trade.partnerTeam.isCpu) {
    return { accept: false, reason: "Not a CPU decision" };
  }

  const roster = trade.partnerTeam.roster.map((r) => toGm(r.player));
  const give = trade.assets
    .filter((a) => a.fromTeamId === trade.partnerTeamId)
    .map((a) => toGm(a.player));
  const get = trade.assets
    .filter((a) => a.fromTeamId === trade.proposerTeamId)
    .map((a) => toGm(a.player));
  const payroll = roster.reduce((s, p) => s + p.salary, 0);

  return evaluateTradeForTeam({
    roster,
    give,
    get,
    salaryCap: trade.league.salaryCap,
    currentPayroll: payroll,
  });
}

export async function assertPlayerInEra(
  playerId: string,
  eraId: string,
): Promise<boolean> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return false;
  return playerInDynastyEra(
    player.yearFrom,
    player.yearTo,
    dynastyEraById(eraId),
  );
}
