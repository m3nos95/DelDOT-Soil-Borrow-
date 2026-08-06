import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

async function main() {
  await prisma.game.deleteMany({ where: { league: { name: "Smoke Test League" } } });
  await prisma.lineupSlot.deleteMany({
    where: { team: { league: { name: "Smoke Test League" } } },
  });
  await prisma.staffSlot.deleteMany({
    where: { team: { league: { name: "Smoke Test League" } } },
  });
  await prisma.rosterSpot.deleteMany({
    where: { team: { league: { name: "Smoke Test League" } } },
  });
  await prisma.team.deleteMany({ where: { league: { name: "Smoke Test League" } } });
  await prisma.league.deleteMany({ where: { name: "Smoke Test League" } });
  console.log("cleaned");
}

main().finally(() => prisma.$disconnect());
