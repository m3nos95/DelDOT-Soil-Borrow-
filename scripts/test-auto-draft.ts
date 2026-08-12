/**
 * Integration: strategic auto-draft builds a real club.
 * Run: npx tsx scripts/test-auto-draft.ts
 */
import "dotenv/config";
import { makePrismaClient } from "./prisma-client";
import bcrypt from "bcryptjs";
import { fillCpuTeams } from "../src/lib/cpu";
import { generateInviteCode } from "../src/lib/league";
import { autoDraftHumanTeam, reassignDraftOrders } from "../src/lib/snake-draft";
import { pitcherRole } from "../src/lib/staff";
import { hitterSlot, isOutfielder, assignedOfSlots } from "../src/lib/draft-strategy";

const prisma = makePrismaClient();

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const user =
    (await prisma.user.findUnique({ where: { username: "autodraft_test" } })) ??
    (await prisma.user.create({
      data: {
        username: "autodraft_test",
        displayName: "AutoDraft",
        passwordHash: await bcrypt.hash("hardball", 10),
      },
    }));

  const league = await prisma.league.create({
    data: {
      name: "AutoDraft Test",
      inviteCode: generateInviteCode(),
      maxTeams: 4,
      gamesPerTeam: 8,
      era: "modern",
      draftRounds: 22,
      commissionerId: user.id,
      status: "drafting",
      teams: {
        create: {
          ownerId: user.id,
          name: "Boston",
          abbreviation: "BOS",
          park: "Boston Park",
          draftOrder: 0,
        },
      },
    },
    include: { teams: true },
  });

  await fillCpuTeams(league.id);
  await reassignDraftOrders(league.id, "stable");

  const human = league.teams[0];
  const res = await autoDraftHumanTeam({
    leagueId: league.id,
    teamId: human.id,
  });

  const roster = await prisma.rosterSpot.findMany({
    where: { teamId: human.id },
    include: { player: true },
  });
  const hitters = roster.filter((r) => !r.player.isPitcher).map((r) => r.player);
  const arms = roster.filter((r) => r.player.isPitcher).map((r) => r.player);
  const sps = arms.filter((p) => pitcherRole(p) === "SP");
  const rps = arms.filter((p) => pitcherRole(p) === "RP");
  const slots = new Set(hitters.map((p) => hitterSlot(p as never)));
  const ofAssigned = assignedOfSlots(hitters as never);
  const ofCount = hitters.filter((p) => isOutfielder(p as never)).length;

  console.log({
    picks: res.picks,
    roster: roster.length,
    hitters: hitters.length,
    sps: sps.length,
    rps: rps.length,
    slots: [...slots],
    ofCount,
    ofAssigned: [...ofAssigned.keys()],
    complete: res.complete,
  });

  assert(roster.length >= 20, `expected ~full roster, got ${roster.length}`);
  assert(hitters.length >= 9, `need lineup bats, got ${hitters.length}`);
  assert(sps.length >= 5, `need 5 SP, got ${sps.length}`);
  assert(rps.length >= 3, `need 3 RP, got ${rps.length}`);
  assert(slots.has("C"), "need a catcher");
  assert(
    slots.has("SS") || slots.has("2B"),
    "need middle infield",
  );
  assert(ofCount >= 3, `need 3 outfielders, got ${ofCount}`);
  assert(ofAssigned.has("CF"), "need a CF body");
  assert(ofAssigned.has("LF"), "need an LF body");
  assert(ofAssigned.has("RF"), "need an RF body");

  // Cleanup
  await prisma.league.delete({ where: { id: league.id } });
  console.log("auto-draft strategy integration OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
