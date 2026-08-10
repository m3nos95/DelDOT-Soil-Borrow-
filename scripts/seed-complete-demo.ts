/** Dev-only: create a league for `aaron` and play it through to a champion. */
import "dotenv/config";
import { makePrismaClient } from "./prisma-client";
import { fillCpuTeams } from "../src/lib/cpu";
import {
  generateInviteCode,
  simulateDays,
  startSeason,
} from "../src/lib/league";
import { runSnakeDraftToCompletion } from "../src/lib/snake-draft";

const prisma = makePrismaClient();

async function main() {
  const aaron = await prisma.user.findUnique({ where: { username: "aaron" } });
  if (!aaron) throw new Error("Run npm run db:setup first");

  const league = await prisma.league.create({
    data: {
      name: "Champions Demo",
      inviteCode: generateInviteCode(),
      maxTeams: 6,
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

  await fillCpuTeams(league.id);
  await runSnakeDraftToCompletion(league.id);
  await startSeason(league.id);

  for (let i = 0; i < 80; i++) {
    const res = await simulateDays(league.id, 5);
    const l = await prisma.league.findUniqueOrThrow({ where: { id: league.id } });
    if (l.status === "complete") break;
    if (!res.simulated) break;
  }

  const champ = await prisma.champion.findFirst({ where: { leagueId: league.id } });
  console.log(`Ready → /league/${league.id}/playoffs`);
  console.log(`League id: ${league.id} · champion: ${champ?.teamName ?? "?"}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
