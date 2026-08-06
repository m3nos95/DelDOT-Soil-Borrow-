import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import {
  generateInviteCode,
  startSeason,
  simulateNextDay,
  ensureDefaultLineup,
} from "../src/lib/league";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function ensureUser(username: string, displayName: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash: await bcrypt.hash("hardball", 10),
    },
  });
}

async function autoDraft(teamId: string, leagueId: string, seed: number) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const taken = new Set(
    (
      await prisma.rosterSpot.findMany({
        where: { team: { leagueId } },
      })
    ).map((r) => r.playerId),
  );

  const all = await prisma.player.findMany();
  const cheapFirst = [...all].sort((a, b) => {
    if (a.salary !== b.salary) return a.salary - b.salary;
    return (
      ((a.name.charCodeAt(0) + seed) % 13) - ((b.name.charCodeAt(0) + seed) % 13)
    );
  });

  let payroll = 0;
  let hitters = 0;
  let pitchers = 0;

  const take = async (p: (typeof all)[number]) => {
    await prisma.rosterSpot.create({ data: { teamId, playerId: p.id } });
    taken.add(p.id);
    payroll += p.salary;
    if (p.isPitcher) pitchers += 1;
    else hitters += 1;
  };

  for (const p of cheapFirst) {
    if (taken.has(p.id)) continue;
    if (payroll + p.salary > league.salaryCap) continue;
    if (!p.isPitcher && hitters < 10) await take(p);
    else if (p.isPitcher && pitchers < 6) await take(p);
    if (hitters >= 10 && pitchers >= 6) break;
  }

  const stars = [...all].sort((a, b) => b.salary - a.salary);
  let starsTaken = 0;
  for (const p of stars) {
    if (taken.has(p.id)) continue;
    if (payroll + p.salary > league.salaryCap) continue;
    if (!p.isPitcher && hitters >= 14) continue;
    if (p.isPitcher && pitchers >= 11) continue;
    await take(p);
    starsTaken += 1;
    if (starsTaken >= 4) break;
  }

  for (const p of cheapFirst) {
    if (taken.has(p.id)) continue;
    if (payroll + p.salary > league.salaryCap) continue;
    if (!p.isPitcher && hitters >= 12) continue;
    if (p.isPitcher && pitchers >= 8) continue;
    await take(p);
    if (hitters + pitchers >= 20) break;
  }

  if (hitters < 10 || pitchers < 6) {
    throw new Error(`Auto-draft underfilled (${hitters}H/${pitchers}P, $${payroll})`);
  }

  await ensureDefaultLineup(teamId);
  await prisma.team.update({
    where: { id: teamId },
    data: { draftReady: true },
  });
}

async function main() {
  const aaron = await ensureUser("aaron", "Aaron");
  const buddy = await ensureUser("buddy", "Buddy");

  const inviteCode = generateInviteCode();
  const league = await prisma.league.create({
    data: {
      name: "Smoke Test League",
      inviteCode,
      maxTeams: 2,
      gamesPerTeam: 6,
      commissionerId: aaron.id,
      status: "drafting",
      teams: {
        create: [
          {
            ownerId: aaron.id,
            name: "Night Owls",
            abbreviation: "OWL",
            park: "Fenway Park",
          },
          {
            ownerId: buddy.id,
            name: "Sandlot Dogs",
            abbreviation: "DOG",
            park: "Wrigley Field",
          },
        ],
      },
    },
    include: { teams: true },
  });

  await autoDraft(league.teams[0].id, league.id, 1);
  await autoDraft(league.teams[1].id, league.id, 4);
  await startSeason(league.id);

  for (let i = 0; i < 3; i++) {
    const res = await simulateNextDay(league.id);
    console.log(`Sim day ${res.dayNumber}: ${res.simulated} games`);
  }

  const standings = await prisma.team.findMany({
    where: { leagueId: league.id },
    orderBy: { wins: "desc" },
  });
  for (const t of standings) {
    console.log(
      `${t.abbreviation}: ${t.wins}-${t.losses} (RS ${t.runsFor} RA ${t.runsAgainst})`,
    );
  }

  const sample = await prisma.game.findFirst({
    where: { leagueId: league.id, status: "final" },
  });
  if (!sample) throw new Error("No final games");
  const plays = JSON.parse(sample.playByPlay) as unknown[];
  console.log(
    `Sample game ${sample.awayScore}-${sample.homeScore}, ${plays.length} PBP lines`,
  );
  console.log(`League ${league.id} invite ${inviteCode}`);
  console.log("SMOKE OK");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
