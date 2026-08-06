import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { SEED_PLAYERS } from "./players";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.player.count();
  if (count === 0) {
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
    console.log(`Seeded ${SEED_PLAYERS.length} players`);
  } else {
    console.log(`Players already seeded (${count})`);
  }

  const demo = await prisma.user.findUnique({ where: { username: "aaron" } });
  if (!demo) {
    await prisma.user.create({
      data: {
        username: "aaron",
        displayName: "Aaron",
        passwordHash: await bcrypt.hash("hardball", 10),
      },
    });
    console.log("Created demo user aaron / hardball");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
