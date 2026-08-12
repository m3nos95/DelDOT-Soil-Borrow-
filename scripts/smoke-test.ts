import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { autoDraftTeam } from "../src/lib/cpu";
import {
  generateInviteCode,
  startSeason,
  simulateNextDay,
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

  await autoDraftTeam(league.teams[0].id, 1);
  await autoDraftTeam(league.teams[1].id, 4);
  await startSeason(league.id);

  for (let i = 0; i < 3; i++) {
    const res = await simulateNextDay(league.id);
    console.log(`Sim day ${res.dayNumber}: ${res.simulated} games`);
  }

  const batStats = await prisma.seasonBattingStat.count({
    where: { leagueId: league.id },
  });
  const pitStats = await prisma.seasonPitchingStat.count({
    where: { leagueId: league.id },
  });
  if (batStats < 1 || pitStats < 1) {
    throw new Error(`Season stats missing (bat ${batStats}, pit ${pitStats})`);
  }
  console.log(`Season stats rows: ${batStats} batting, ${pitStats} pitching`);

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
