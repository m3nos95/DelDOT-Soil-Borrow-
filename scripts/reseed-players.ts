import "dotenv/config";
import { spawnSync } from "child_process";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

async function main() {
  console.log("Clearing league data that references players…");
  await prisma.game.deleteMany();
  await prisma.lineupSlot.deleteMany();
  await prisma.staffSlot.deleteMany();
  await prisma.rosterSpot.deleteMany();
  await prisma.team.deleteMany();
  await prisma.league.deleteMany();

  console.log("Running prisma/seed.ts…");
  const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

main().finally(() => prisma.$disconnect());
