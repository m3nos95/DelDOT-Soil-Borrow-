/**
 * Integration: CPU fill + season stats + trade fairness against CPU.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { evaluateIncomingTradeAsCpu, fillCpuTeams } from "../src/lib/cpu";
import { generateInviteCode, simulateNextDay, startSeason } from "../src/lib/league";
import { executeTrade } from "../src/lib/trades";
import { autoDraftTeam } from "../src/lib/cpu";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user =
    (await prisma.user.findUnique({ where: { username: "cpu_test_aaron" } })) ??
    (await prisma.user.create({
      data: {
        username: "cpu_test_aaron",
        displayName: "CPU Test",
        passwordHash: await bcrypt.hash("hardball", 10),
      },
    }));

  const league = await prisma.league.create({
    data: {
      name: "CPU Season Test",
      inviteCode: generateInviteCode(),
      maxTeams: 4,
      gamesPerTeam: 8,
      era: "modern",
      commissionerId: user.id,
      status: "drafting",
      teams: {
        create: {
          ownerId: user.id,
          name: "Boston",
          abbreviation: "BOS",
          park: "Boston Park",
          isCpu: false,
        },
      },
    },
    include: { teams: true },
  });

  await autoDraftTeam(league.teams[0].id, 2);
  const filled = await fillCpuTeams(league.id);
  if (filled.created !== 3) {
    throw new Error(`Expected 3 CPU teams, got ${filled.created}`);
  }

  const teams = await prisma.team.findMany({ where: { leagueId: league.id } });
  if (teams.length !== 4) throw new Error("League not full");
  if (!teams.every((t) => t.draftReady)) throw new Error("Not all ready");
  if (teams.filter((t) => t.isCpu).length !== 3) throw new Error("CPU count");

  await startSeason(league.id);
  for (let i = 0; i < 2; i++) await simulateNextDay(league.id);

  const bat = await prisma.seasonBattingStat.count({
    where: { leagueId: league.id },
  });
  if (bat < 8) throw new Error(`Expected batting stats, got ${bat}`);

  const human = teams.find((t) => !t.isCpu)!;
  const cpu = teams.find((t) => t.isCpu)!;
  const humanRoster = await prisma.rosterSpot.findMany({
    where: { teamId: human.id },
    include: { player: true },
  });
  const cpuRoster = await prisma.rosterSpot.findMany({
    where: { teamId: cpu.id },
    include: { player: true },
  });
  const humanJunk = [...humanRoster].sort(
    (a, b) => a.player.careerWAR - b.player.careerWAR,
  )[0];
  const cpuStar = [...cpuRoster].sort(
    (a, b) => b.player.careerWAR - a.player.careerWAR,
  )[0];

  // Ask CPU to give its star for human junk → reject
  const dump = await executeTrade({
    leagueId: league.id,
    proposerTeamId: human.id,
    partnerTeamId: cpu.id,
    proposerPlayerIds: [humanJunk.playerId],
    partnerPlayerIds: [cpuStar.playerId],
    note: "test dump",
    autoAccept: false,
  });
  const decision = await evaluateIncomingTradeAsCpu(dump.id);
  if (decision.accept) {
    throw new Error(`CPU should reject dump: ${decision.reason}`);
  }
  console.log("CPU rejected dump:", decision.reason);
  await prisma.trade.update({
    where: { id: dump.id },
    data: { status: "rejected", resolvedAt: new Date() },
  });

  console.log("CPU SEASON OK", {
    teams: teams.length,
    battingRows: bat,
    cpuRejectedDump: decision.reason,
    games: await prisma.game.count({
      where: { leagueId: league.id, status: "final" },
    }),
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
