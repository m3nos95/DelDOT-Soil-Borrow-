import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

async function main() {
  const names = [
    "Babe Ruth",
    "Satchel Paige",
    "Josh Gibson",
    "Shohei Ohtani",
    "Tony Gwynn",
    "Cy Young",
  ];
  for (const name of names) {
    const rows = await prisma.player.findMany({
      where: { name: { contains: name } },
      select: {
        name: true,
        yearFrom: true,
        yearTo: true,
        isPitcher: true,
        salary: true,
        fangraphsId: true,
      },
    });
    console.log(name, rows.length, rows.slice(0, 3));
  }
  console.log("total", await prisma.player.count());
  const ruth = await prisma.player.findMany({ where: { name: "Babe Ruth" } });
  console.log("exact Babe Ruth rows", ruth.length);
}

main().finally(() => prisma.$disconnect());
