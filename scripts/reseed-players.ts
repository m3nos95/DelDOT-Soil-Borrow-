import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { SEED_PLAYERS } from "../prisma/players";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

async function main() {
  // Only safe when no roster spots reference players — wipe dependent league data first
  await prisma.game.deleteMany();
  await prisma.lineupSlot.deleteMany();
  await prisma.staffSlot.deleteMany();
  await prisma.rosterSpot.deleteMany();
  await prisma.team.deleteMany();
  await prisma.league.deleteMany();
  await prisma.player.deleteMany();

  await prisma.player.createMany({
    data: SEED_PLAYERS.map((p) => ({
      name: p.name,
      yearFrom: p.yearFrom,
      yearTo: p.yearTo,
      primaryPos: p.primaryPos,
      positions: p.positions.join(","),
      bats: p.bats,
      throws: p.throws,
      salary: p.salary,
      isPitcher: p.isPitcher,
      kRate: p.kRate,
      bbRate: p.bbRate,
      hbpRate: p.hbpRate,
      singleRate: p.singleRate,
      doubleRate: p.doubleRate,
      tripleRate: p.tripleRate,
      hrRate: p.hrRate,
      stuff: p.stuff ?? 50,
      control: p.control ?? 50,
      durability: p.durability ?? 50,
      description: p.description ?? "",
    })),
  });
  console.log(`Reseeded ${SEED_PLAYERS.length} players`);
}

main().finally(() => prisma.$disconnect());
