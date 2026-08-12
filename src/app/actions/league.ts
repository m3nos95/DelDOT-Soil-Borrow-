"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  dynastyEraById,
  playerInDynastyEra,
} from "@/lib/environment";
import { getFranchise } from "@/lib/franchises";
import {
  evaluateIncomingTradeAsCpu,
  fillCpuTeams,
  runCpuFrontOffice,
} from "@/lib/cpu";
import { evaluateTradeForTeam, type GmPlayer } from "@/lib/gm";
import {
  draftedPlayerIds,
  generateInviteCode,
  getLeaguePayroll,
  progressLeague,
  simulateNextDay,
  simulateScheduledGame,
  startSeason,
  ensureDefaultLineup,
} from "@/lib/league";
import {
  advanceCpuPicks,
  autoDraftHumanTeam,
  getDraftState,
  reassignDraftOrders,
} from "@/lib/snake-draft";
import { canAffordDraftPick } from "@/lib/cap";
import {
  applyTradeAssets,
  cancelTrade,
  executeTrade,
  rejectTrade,
  validateTradePieces,
} from "@/lib/trades";

export type ActionState = {
  error?: string;
  ok?: boolean;
  message?: string;
  done?: boolean;
  simulated?: number;
  status?: string;
};

async function mustUser() {
  const user = await requireUser();
  if (!user) redirect("/login");
  return user;
}

function resolveFranchise(formData: FormData) {
  const raw = String(formData.get("franchiseCode") ?? "").trim().toUpperCase();
  const franchise = getFranchise(raw);
  if (!franchise) return { error: "Pick a city slot (ARI, BOS, LANL…)" as const };
  return { franchise };
}

export async function createLeagueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await mustUser();
  const name = String(formData.get("name") ?? "").trim();
  const maxTeams = Number(formData.get("maxTeams") ?? 6);
  const gamesPerTeam = Number(formData.get("gamesPerTeam") ?? 162);
  const eraId = String(formData.get("era") ?? "modern").trim();
  if (!["pre1950", "classic", "freeagent", "modern", "open"].includes(eraId)) {
    return { error: "Pick a dynasty era" };
  }
  const era = dynastyEraById(eraId);
  const picked = resolveFranchise(formData);
  if ("error" in picked) return { error: picked.error };
  const { franchise } = picked;

  if (name.length < 3) return { error: "League name is too short" };
  if (maxTeams < 2 || maxTeams > 30) return { error: "Teams must be 2–30" };

  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.league.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = generateInviteCode();
  }

  const league = await prisma.league.create({
    data: {
      name,
      inviteCode,
      maxTeams,
      gamesPerTeam,
      era: era.id,
      salaryCap: 120_000_000,
      commissionerId: user.id,
      status: "drafting",
      draftPickNumber: 0,
      draftRounds: 22,
      teams: {
        create: {
          ownerId: user.id,
          name: franchise.name,
          abbreviation: franchise.code,
          park: franchise.park,
          draftOrder: 0,
        },
      },
    },
  });

  redirect(`/league/${league.id}`);
}

export async function joinLeagueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await mustUser();
  const code = String(formData.get("inviteCode") ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
  const picked = resolveFranchise(formData);
  if ("error" in picked) return { error: picked.error };
  const { franchise } = picked;

  if (!code) return { error: "Enter an invite code" };

  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
    include: { teams: true },
  });
  if (!league) return { error: "No league with that code" };
  if (league.status !== "drafting" && league.status !== "forming") {
    return { error: "That league is no longer accepting teams" };
  }
  if (league.draftPickNumber > 0) {
    return { error: "Snake draft already started — joining is closed" };
  }
  if (league.teams.some((t) => t.ownerId === user.id && !t.isCpu)) {
    redirect(`/league/${league.id}`);
  }
  if (league.teams.length >= league.maxTeams) {
    return { error: "League is full" };
  }
  if (league.teams.some((t) => t.abbreviation === franchise.code)) {
    return { error: `${franchise.code} is already taken in this league` };
  }

  await prisma.team.create({
    data: {
      leagueId: league.id,
      ownerId: user.id,
      name: franchise.name,
      abbreviation: franchise.code,
      park: franchise.park,
      draftOrder: league.teams.length,
    },
  });
  await reassignDraftOrders(league.id, "shuffle");

  redirect(`/league/${league.id}`);
}

export async function draftPlayerAction(
  leagueId: string,
  playerId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id, isCpu: false },
    include: { roster: { include: { player: true } }, league: true },
  });
  if (!team) return { error: "You are not in this league" };
  if (team.league.status !== "drafting") return { error: "Draft is closed" };

  const state = await getDraftState(leagueId);
  if (state.numTeams < 2) {
    return { error: "Need at least 2 teams before drafting (invite or fill CPU)" };
  }
  if (state.complete) return { error: "Snake draft is already finished" };
  if (!state.onClock || state.onClock.id !== team.id) {
    const who = state.onClock?.abbreviation ?? "another team";
    return { error: `It's ${who}'s pick` };
  }

  const taken = await draftedPlayerIds(leagueId);
  if (taken.has(playerId)) return { error: "Player already drafted" };

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return { error: "Player not found" };

  const era = dynastyEraById(team.league.era);
  if (!playerInDynastyEra(player.yearFrom, player.yearTo, era)) {
    return {
      error: `${player.name} is outside this league’s era (${era.label})`,
    };
  }

  const payroll = team.roster.reduce((s, r) => s + r.player.salary, 0);
  const hitters = team.roster.filter((r) => !r.player.isPitcher).length;
  const pitchers = team.roster.filter((r) => r.player.isPitcher).length;

  const afford = canAffordDraftPick({
    payroll,
    salaryCap: team.league.salaryCap,
    rosterLen: team.roster.length,
    draftRounds: team.league.draftRounds,
    pickSalary: player.salary,
    hitters,
    pitchers,
    pickingPitcher: player.isPitcher,
  });
  if (!afford.ok) return { error: afford.error };

  if (!player.isPitcher && hitters >= 14) {
    return { error: "Max 14 position players" };
  }
  if (player.isPitcher && pitchers >= 11) {
    return { error: "Max 11 pitchers" };
  }
  if (team.roster.length >= 25) return { error: "Roster is full (25)" };
  if (team.roster.length >= team.league.draftRounds) {
    return { error: "You've made all your draft picks" };
  }

  try {
    await prisma.rosterSpot.create({
      data: { teamId: team.id, playerId, leagueId },
    });
  } catch {
    return { error: "Player already drafted" };
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: { draftPickNumber: state.pickNumber + 1 },
  });

  // CPU teams pick automatically until the next human is on the clock
  await advanceCpuPicks(leagueId);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/draft`);
  return { ok: true };
}

/** Advance CPU picks if a computer team is on the clock (page load / poll). */
export async function syncDraftClockAction(
  leagueId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id },
  });
  if (!team) return { error: "You are not in this league" };
  const res = await advanceCpuPicks(leagueId);
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/draft`);
  return {
    ok: true,
    message: res.complete
      ? "Snake draft complete"
      : res.made
        ? `CPU made ${res.made} pick${res.made === 1 ? "" : "s"}`
        : undefined,
  };
}

/** Auto-build your snake-draft roster (needs-based strategy while on the clock). */
export async function autoDraftMyTeamAction(
  leagueId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id, isCpu: false },
    include: { league: true },
  });
  if (!team) return { error: "You are not in this league" };
  if (team.league.status !== "drafting") return { error: "Draft is closed" };

  const state = await getDraftState(leagueId);
  if (state.numTeams < 2) {
    return { error: "Need at least 2 teams before drafting (invite or fill CPU)" };
  }
  if (state.complete) return { ok: true, message: "Snake draft already finished" };

  const res = await autoDraftHumanTeam({ leagueId, teamId: team.id });
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/draft`);

  if (res.stuck) {
    return {
      ok: true,
      message: `Auto-drafted ${res.picks} · stuck on cap/pool with ${res.rosterSize} players`,
    };
  }
  if (res.complete) {
    return {
      ok: true,
      message: `Built your club (${res.rosterSize} players, ${res.picks} auto picks) — draft complete`,
    };
  }
  if (res.waitingOn) {
    return {
      ok: true,
      message: `Built toward a full roster (${res.rosterSize} players, +${res.picks}) · waiting on ${res.waitingOn}`,
    };
  }
  if (res.rosterSize >= team.league.draftRounds) {
    return {
      ok: true,
      message: `Roster filled (${res.rosterSize}/${team.league.draftRounds})`,
    };
  }
  return {
    ok: true,
    message: res.picks
      ? `Auto-drafted ${res.picks} · roster at ${res.rosterSize}`
      : "No picks made yet — fill CPU / wait for your turn",
  };
}

export async function deleteLeagueAction(
  leagueId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };
  if (league.commissionerId !== user.id) {
    return { error: "Only the commissioner can delete this league" };
  }

  await prisma.league.delete({ where: { id: leagueId } });
  revalidatePath("/clubhouse");
  return { ok: true, message: `Deleted ${league.name}` };
}

export async function releasePlayerAction(
  leagueId: string,
  playerId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id },
    include: { league: true },
  });
  if (!team) return { error: "You are not in this league" };
  if (team.league.status === "drafting") {
    return { error: "Can't drop during the snake draft" };
  }
  if (team.league.status !== "season") return { error: "Can't drop now" };

  await prisma.rosterSpot.deleteMany({
    where: { teamId: team.id, playerId },
  });
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/draft`);
  return { ok: true };
}

export async function setDraftReadyAction(
  leagueId: string,
  ready: boolean,
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id },
    include: { roster: { include: { player: true } }, league: true },
  });
  if (!team) return { error: "You are not in this league" };
  if (team.league.status !== "drafting") return { error: "Not in draft" };

  const state = await getDraftState(leagueId);
  if (!state.complete) {
    return {
      error: "Finish the snake draft first — picks alternate team-by-team",
    };
  }

  if (ready) {
    const { MIN_PITCHERS, countPitcherBuckets } = await import("@/lib/staff");
    const hitters = team.roster.filter((r) => !r.player.isPitcher).length;
    const pitchers = team.roster.filter((r) => r.player.isPitcher);
    const buckets = countPitcherBuckets(pitchers.map((r) => r.player));
    if (hitters < 10) return { error: "Need at least 10 hitters" };
    if (buckets.total < MIN_PITCHERS) {
      return {
        error: `Need at least ${MIN_PITCHERS} pitchers (5 starters + bullpen)`,
      };
    }
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { draftReady: ready },
  });
  revalidatePath(`/league/${leagueId}`);
  return { ok: true };
}

export async function fillCpuTeamsAction(leagueId: string): Promise<ActionState> {
  const user = await mustUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };
  if (league.commissionerId !== user.id) {
    return { error: "Only the commissioner can fill CPU teams" };
  }
  try {
    const res = await fillCpuTeams(leagueId);
    revalidatePath(`/league/${leagueId}`);
    revalidatePath(`/league/${leagueId}/draft`);
    return {
      ok: true,
      message: res.created
        ? `Filled ${res.created} CPU team${res.created === 1 ? "" : "s"} · draft order randomized`
        : "League already full · draft order re-randomized",
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not fill CPU teams" };
  }
}

/** Commissioner: re-roll round-1 lottery before pick 1. */
export async function randomizeDraftOrderAction(
  leagueId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };
  if (league.commissionerId !== user.id) {
    return { error: "Only the commissioner can randomize draft order" };
  }
  if (league.status !== "drafting") return { error: "Draft is closed" };
  if (league.draftPickNumber > 0) {
    return { error: "Draft already started — order is locked" };
  }
  const n = await reassignDraftOrders(leagueId, "shuffle");
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/draft`);
  return {
    ok: true,
    message: `Randomized round-1 order for ${n} teams (last pick snakes back first in round 2)`,
  };
}

export async function startSeasonAction(leagueId: string): Promise<ActionState> {
  const user = await mustUser();
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (!league) return { error: "League not found" };
  if (league.commissionerId !== user.id) {
    return { error: "Only the commissioner can start the season" };
  }
  try {
    // Pad empty slots with CPU clubs only before the snake starts, then
    // require the snake draft to finish before opening the season.
    if (league.teams.length < league.maxTeams) {
      if (league.draftPickNumber > 0) {
        return { error: "Fill CPU slots before the first pick" };
      }
      await fillCpuTeams(leagueId);
    }
    await advanceCpuPicks(leagueId);
    const state = await getDraftState(leagueId);
    if (!state.complete) {
      return {
        error:
          "Finish the snake draft first (open Draft and take your picks)",
      };
    }
    await startSeason(leagueId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not start" };
  }
  revalidatePath(`/league/${leagueId}`);
  redirect(`/league/${leagueId}`);
}

export async function saveLineupAction(
  leagueId: string,
  slots: { playerId: string; battingOrder: number; position: string }[],
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id },
    include: { roster: true },
  });
  if (!team) return { error: "Not your team" };

  const rosterIds = new Set(team.roster.map((r) => r.playerId));
  if (slots.length !== 9) return { error: "Need exactly 9 lineup spots" };
  if (slots.some((s) => !rosterIds.has(s.playerId))) {
    return { error: "Player not on roster" };
  }

  await prisma.$transaction([
    prisma.lineupSlot.deleteMany({ where: { teamId: team.id } }),
    prisma.lineupSlot.createMany({
      data: slots.map((s) => ({
        teamId: team.id,
        playerId: s.playerId,
        battingOrder: s.battingOrder,
        position: s.position,
      })),
    }),
  ]);

  revalidatePath(`/league/${leagueId}/team`);
  return { ok: true };
}

export async function saveStaffAction(
  leagueId: string,
  slots: { playerId: string; role: string }[],
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id },
    include: { roster: { include: { player: true } } },
  });
  if (!team) return { error: "Not your team" };

  const pitchers = new Set(
    team.roster.filter((r) => r.player.isPitcher).map((r) => r.playerId),
  );
  if (slots.some((s) => !pitchers.has(s.playerId))) {
    return { error: "Staff must be pitchers on your roster" };
  }

  const { validateStaffSlots } = await import("@/lib/staff");
  const staffErr = validateStaffSlots(slots);
  if (staffErr) return { error: staffErr };

  await prisma.$transaction([
    prisma.staffSlot.deleteMany({ where: { teamId: team.id } }),
    prisma.staffSlot.createMany({
      data: slots.map((s) => ({
        teamId: team.id,
        playerId: s.playerId,
        role: s.role,
      })),
    }),
  ]);

  revalidatePath(`/league/${leagueId}/team`);
  return { ok: true };
}

async function assertLeagueMember(leagueId: string, userId: string) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" as const };
  const member = await prisma.team.findFirst({
    where: { leagueId, ownerId: userId, isCpu: false },
  });
  if (!member && league.commissionerId !== userId) {
    return { error: "Not in this league" as const };
  }
  return { league, member };
}

export async function simDayAction(leagueId: string): Promise<ActionState> {
  const user = await mustUser();
  const gate = await assertLeagueMember(leagueId, user.id);
  if ("error" in gate && gate.error) return { error: gate.error };
  const status = gate.league!.status;
  if (status !== "season" && status !== "playoffs") {
    return { error: "Season not running" };
  }

  if (status === "season") await runCpuFrontOffice(leagueId);
  const res = await simulateNextDay(leagueId);
  const after = await prisma.league.findUnique({ where: { id: leagueId } });
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/standings`);
  revalidatePath(`/league/${leagueId}/stats`);
  revalidatePath(`/league/${leagueId}/free-agency`);
  revalidatePath(`/league/${leagueId}/trades`);
  revalidatePath(`/league/${leagueId}/live`);
  revalidatePath(`/league/${leagueId}/awards`);
  revalidatePath(`/league/${leagueId}/playoffs`);
  return {
    ok: true,
    simulated: res.simulated,
    status: after?.status,
    done: after?.status === "complete",
  };
}

export async function setAutoAdvanceAction(
  leagueId: string,
  on: boolean,
): Promise<ActionState> {
  const user = await mustUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };
  if (league.commissionerId !== user.id) {
    return { error: "Only the commissioner can change the schedule cadence" };
  }
  await prisma.league.update({
    where: { id: leagueId },
    data: { autoAdvance: on },
  });
  revalidatePath(`/league/${leagueId}/live`);
  revalidatePath(`/league/${leagueId}`);
  return { ok: true };
}

export async function simWeekAction(leagueId: string): Promise<ActionState> {
  const user = await mustUser();
  const gate = await assertLeagueMember(leagueId, user.id);
  if ("error" in gate && gate.error) return { error: gate.error };
  const wkStatus = gate.league!.status;
  if (wkStatus !== "season" && wkStatus !== "playoffs") {
    return { error: "Season not running" };
  }

  for (let i = 0; i < 7; i++) {
    const cur = await prisma.league.findUnique({ where: { id: leagueId } });
    if (cur?.status === "season") await runCpuFrontOffice(leagueId);
    const res = await simulateNextDay(leagueId);
    if (!res.simulated) break;
  }
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/standings`);
  revalidatePath(`/league/${leagueId}/stats`);
  revalidatePath(`/league/${leagueId}/free-agency`);
  revalidatePath(`/league/${leagueId}/trades`);
  return { ok: true };
}

export async function simGameAction(
  leagueId: string,
  gameId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league || league.status !== "season") return { error: "Unavailable" };
  const member = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id },
  });
  if (!member && league.commissionerId !== user.id) {
    return { error: "Not in this league" };
  }

  await simulateScheduledGame(gameId);
  await progressLeague(leagueId);
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/game/${gameId}`);
  return { ok: true };
}

export async function getPayrollAction(teamId: string) {
  return getLeaguePayroll(teamId);
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

export async function signFreeAgentAction(
  leagueId: string,
  playerId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id, isCpu: false },
    include: { roster: { include: { player: true } }, league: true },
  });
  if (!team) return { error: "You are not in this league" };
  if (team.league.status !== "season") {
    return { error: "Free agency opens once the season starts" };
  }

  const taken = await draftedPlayerIds(leagueId);
  if (taken.has(playerId)) return { error: "Player is already on a roster" };

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return { error: "Player not found" };
  const era = dynastyEraById(team.league.era);
  if (!playerInDynastyEra(player.yearFrom, player.yearTo, era)) {
    return { error: `${player.name} is outside this league’s era` };
  }

  const payroll = team.roster.reduce((s, r) => s + r.player.salary, 0);
  if (payroll + player.salary > team.league.salaryCap) {
    return { error: "Over the salary cap" };
  }
  const hitters = team.roster.filter((r) => !r.player.isPitcher).length;
  const pitchers = team.roster.filter((r) => r.player.isPitcher).length;
  if (!player.isPitcher && hitters >= 14) return { error: "Max 14 position players" };
  if (player.isPitcher && pitchers >= 11) return { error: "Max 11 pitchers" };
  if (team.roster.length >= 25) return { error: "Roster is full (25)" };

  try {
    await prisma.rosterSpot.create({
      data: { teamId: team.id, playerId, leagueId },
    });
  } catch {
    return { error: "Player is already on a roster" };
  }
  await ensureDefaultLineup(team.id);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/free-agency`);
  revalidatePath(`/league/${leagueId}/team`);
  revalidatePath(`/league/${leagueId}/draft`);
  return { ok: true };
}

export async function cutPlayerAction(
  leagueId: string,
  playerId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id, isCpu: false },
    include: { league: true, roster: { include: { player: true } } },
  });
  if (!team) return { error: "You are not in this league" };
  if (team.league.status !== "season") {
    return { error: "Use the draft board to drop players before the season" };
  }
  const spot = team.roster.find((r) => r.playerId === playerId);
  if (!spot) return { error: "Player not on your roster" };

  const hitters = team.roster.filter((r) => !r.player.isPitcher).length;
  const pitchers = team.roster.filter((r) => r.player.isPitcher).length;
  if (!spot.player.isPitcher && hitters <= 9) {
    return { error: "Need at least 9 hitters" };
  }
  if (spot.player.isPitcher && pitchers <= 8) {
    return { error: "Need at least 8 pitchers (5 SP + bullpen)" };
  }

  await prisma.lineupSlot.deleteMany({ where: { teamId: team.id, playerId } });
  await prisma.staffSlot.deleteMany({ where: { teamId: team.id, playerId } });
  await prisma.rosterSpot.deleteMany({ where: { teamId: team.id, playerId } });
  await ensureDefaultLineup(team.id);

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/free-agency`);
  revalidatePath(`/league/${leagueId}/team`);
  return { ok: true };
}

export async function proposeTradeAction(
  leagueId: string,
  partnerTeamId: string,
  givePlayerIds: string[],
  getPlayerIds: string[],
): Promise<ActionState> {
  const user = await mustUser();
  const myTeam = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id, isCpu: false },
  });
  if (!myTeam) return { error: "You are not in this league" };

  try {
    await validateTradePieces({
      leagueId,
      proposerTeamId: myTeam.id,
      partnerTeamId,
      proposerPlayerIds: givePlayerIds,
      partnerPlayerIds: getPlayerIds,
    });

    const partner = await prisma.team.findFirst({
      where: { id: partnerTeamId, leagueId },
      include: { roster: { include: { player: true } }, league: true },
    });
    if (!partner) return { error: "Partner team not found" };

    const trade = await executeTrade({
      leagueId,
      proposerTeamId: myTeam.id,
      partnerTeamId,
      proposerPlayerIds: givePlayerIds,
      partnerPlayerIds: getPlayerIds,
      note: "Human proposal",
      autoAccept: false,
    });

    if (partner.isCpu) {
      const decision = await evaluateIncomingTradeAsCpu(trade.id);
      if (decision.accept) {
        await applyTradeAssets(trade.id);
        revalidatePath(`/league/${leagueId}/trades`);
        revalidatePath(`/league/${leagueId}/team`);
        return { ok: true, message: `CPU accepted: ${decision.reason}` };
      }
      await rejectTrade(trade.id);
      return { error: `CPU declined: ${decision.reason}` };
    }

    revalidatePath(`/league/${leagueId}/trades`);
    return { ok: true, message: "Trade offer sent" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Trade failed" };
  }
}

export async function respondTradeAction(
  leagueId: string,
  tradeId: string,
  accept: boolean,
): Promise<ActionState> {
  const user = await mustUser();
  const myTeam = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id, isCpu: false },
  });
  if (!myTeam) return { error: "You are not in this league" };

  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, leagueId, status: "pending" },
    include: {
      assets: { include: { player: true } },
      league: true,
    },
  });
  if (!trade) return { error: "Trade not found" };

  const isPartner = trade.partnerTeamId === myTeam.id;
  const isProposer = trade.proposerTeamId === myTeam.id;
  if (!isPartner && !(isProposer && !accept)) {
    return { error: "Not your trade to decide" };
  }

  if (!accept) {
    if (isProposer) await cancelTrade(tradeId);
    else await rejectTrade(tradeId);
    revalidatePath(`/league/${leagueId}/trades`);
    return { ok: true, message: isProposer ? "Offer withdrawn" : "Trade rejected" };
  }

  // Human accept — still run fairness sanity for their own roster health
  const give = trade.assets
    .filter((a) => a.fromTeamId === myTeam.id)
    .map((a) => toGm(a.player));
  const get = trade.assets
    .filter((a) => a.fromTeamId !== myTeam.id)
    .map((a) => toGm(a.player));
  const rosterSpots = await prisma.rosterSpot.findMany({
    where: { teamId: myTeam.id },
    include: { player: true },
  });
  const check = evaluateTradeForTeam({
    roster: rosterSpots.map((s) => toGm(s.player)),
    give,
    get,
    salaryCap: trade.league.salaryCap,
    currentPayroll: rosterSpots.reduce((s, r) => s + r.player.salary, 0),
  });
  if (!check.accept && check.reason.includes("cap")) {
    return { error: check.reason };
  }

  try {
    await applyTradeAssets(tradeId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not complete trade" };
  }
  revalidatePath(`/league/${leagueId}/trades`);
  revalidatePath(`/league/${leagueId}/team`);
  revalidatePath(`/league/${leagueId}/stats`);
  return { ok: true, message: "Trade completed" };
}
