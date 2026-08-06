"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PARKS } from "@/lib/constants";
import {
  draftedPlayerIds,
  generateInviteCode,
  getLeaguePayroll,
  simulateNextDay,
  simulateScheduledGame,
  startSeason,
} from "@/lib/league";

export type ActionState = { error?: string; ok?: boolean };

async function mustUser() {
  const user = await requireUser();
  if (!user) redirect("/login");
  return user;
}

export async function createLeagueAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await mustUser();
  const name = String(formData.get("name") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();
  const abbreviation = String(formData.get("abbreviation") ?? "")
    .trim()
    .toUpperCase();
  const park = String(formData.get("park") ?? PARKS[0]);
  const maxTeams = Number(formData.get("maxTeams") ?? 6);
  const gamesPerTeam = Number(formData.get("gamesPerTeam") ?? 20);

  if (name.length < 3) return { error: "League name is too short" };
  if (teamName.length < 2) return { error: "Team name is too short" };
  if (!/^[A-Z]{2,4}$/.test(abbreviation)) {
    return { error: "Abbreviation must be 2–4 letters" };
  }
  if (maxTeams < 2 || maxTeams > 8) return { error: "Teams must be 2–8" };

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
      salaryCap: 120_000_000,
      commissionerId: user.id,
      status: "drafting",
      teams: {
        create: {
          ownerId: user.id,
          name: teamName,
          abbreviation,
          park: PARKS.includes(park as (typeof PARKS)[number])
            ? park
            : PARKS[0],
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
    .toUpperCase();
  const teamName = String(formData.get("teamName") ?? "").trim();
  const abbreviation = String(formData.get("abbreviation") ?? "")
    .trim()
    .toUpperCase();
  const park = String(formData.get("park") ?? PARKS[0]);

  if (!code) return { error: "Enter an invite code" };
  if (teamName.length < 2) return { error: "Team name is too short" };
  if (!/^[A-Z]{2,4}$/.test(abbreviation)) {
    return { error: "Abbreviation must be 2–4 letters" };
  }

  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
    include: { teams: true },
  });
  if (!league) return { error: "No league with that code" };
  if (league.status !== "drafting" && league.status !== "forming") {
    return { error: "That league is no longer accepting teams" };
  }
  if (league.teams.some((t) => t.ownerId === user.id)) {
    redirect(`/league/${league.id}`);
  }
  if (league.teams.length >= league.maxTeams) {
    return { error: "League is full" };
  }
  if (league.teams.some((t) => t.abbreviation === abbreviation)) {
    return { error: "Abbreviation already taken in this league" };
  }

  await prisma.team.create({
    data: {
      leagueId: league.id,
      ownerId: user.id,
      name: teamName,
      abbreviation,
      park: PARKS.includes(park as (typeof PARKS)[number]) ? park : PARKS[0],
    },
  });

  redirect(`/league/${league.id}`);
}

export async function draftPlayerAction(
  leagueId: string,
  playerId: string,
): Promise<ActionState> {
  const user = await mustUser();
  const team = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id },
    include: { roster: { include: { player: true } }, league: true },
  });
  if (!team) return { error: "You are not in this league" };
  if (team.league.status !== "drafting") return { error: "Draft is closed" };
  if (team.draftReady) return { error: "You already locked your roster" };

  const taken = await draftedPlayerIds(leagueId);
  if (taken.has(playerId)) return { error: "Player already drafted" };

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return { error: "Player not found" };

  const payroll = team.roster.reduce((s, r) => s + r.player.salary, 0);
  if (payroll + player.salary > team.league.salaryCap) {
    return { error: "Over the salary cap" };
  }

  const hitters = team.roster.filter((r) => !r.player.isPitcher).length;
  const pitchers = team.roster.filter((r) => r.player.isPitcher).length;
  if (!player.isPitcher && hitters >= 14) {
    return { error: "Max 14 position players" };
  }
  if (player.isPitcher && pitchers >= 11) {
    return { error: "Max 11 pitchers" };
  }
  if (team.roster.length >= 25) return { error: "Roster is full (25)" };

  await prisma.rosterSpot.create({
    data: { teamId: team.id, playerId },
  });

  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/draft`);
  return { ok: true };
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
  if (team.league.status !== "drafting") return { error: "Draft is closed" };
  if (team.draftReady) return { error: "Roster is locked" };

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

  if (ready) {
    const hitters = team.roster.filter((r) => !r.player.isPitcher).length;
    const pitchers = team.roster.filter((r) => r.player.isPitcher).length;
    if (hitters < 10) return { error: "Need at least 10 hitters" };
    if (pitchers < 6) return { error: "Need at least 6 pitchers" };
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { draftReady: ready },
  });
  revalidatePath(`/league/${leagueId}`);
  return { ok: true };
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

export async function simDayAction(leagueId: string): Promise<ActionState> {
  const user = await mustUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };
  if (league.status !== "season") return { error: "Season not running" };
  const member = await prisma.team.findFirst({
    where: { leagueId, ownerId: user.id },
  });
  if (!member && league.commissionerId !== user.id) {
    return { error: "Not in this league" };
  }

  await simulateNextDay(leagueId);
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/standings`);
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
  revalidatePath(`/league/${leagueId}`);
  revalidatePath(`/league/${leagueId}/game/${gameId}`);
  return { ok: true };
}

export async function getPayrollAction(teamId: string) {
  return getLeaguePayroll(teamId);
}
