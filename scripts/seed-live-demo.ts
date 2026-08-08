/** Dev-only: create an in-season league for `aaron` with a couple days played. */
import "dotenv/config";
import { makePrismaClient } from "./prisma-client";
import { autoDraftTeam, fillCpuTeams } from "../src/lib/cpu";
import {
  generateInviteCode,
  simulateNextDay,
  startSeason,
} from "../src/lib/league";

const prisma = makePrismaClient();

async function main() {
  const aaron = await prisma.user.findUnique({ where: { username: "aaron" } });
  if (!aaron) throw new Error("Seed the base data first (npm run db:setup)");

  const existing = await prisma.league.findFirst({
    where: { name: "Broadcast Demo", commissionerId: aaron.id },
  });
  if (existing) {
    console.log(`Already exists: /league/${existing.id}/live`);
    return;
  }

  const league = await prisma.league.create({
    data: {
      name: "Broadcast Demo",
      inviteCode: generateInviteCode(),
      maxTeams: 4,
      gamesPerTeam: 12,
      era: "modern",
      commissionerId: aaron.id,
      status: "drafting",
      teams: {
        create: {
          ownerId: aaron.id,
          name: "Boston",
          abbreviation: "BOS",
          park: "Boston Park",
        },
      },
    },
    include: { teams: true },
  });

  await autoDraftTeam(league.teams[0].id, 2);
  await fillCpuTeams(league.id);
  await startSeason(league.id);
  await simulateNextDay(league.id);
  await simulateNextDay(league.id);

  console.log(`Ready → /league/${league.id}/live`);
  console.log(`League id: ${league.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
