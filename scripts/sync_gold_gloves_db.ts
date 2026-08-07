/**
 * Non-destructive: copy goldGloves (+ description GG tag) from career_players.json
 * onto existing Player rows by fangraphsId.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

type Card = {
  fangraphsId: number;
  name: string;
  goldGloves?: number;
  description?: string;
};

async function main() {
  const jsonPath = path.join(process.cwd(), "data", "career_players.json");
  const cards = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Card[];
  let updated = 0;
  for (const c of cards) {
    if (!c.fangraphsId) continue;
    const gg = c.goldGloves ?? 0;
    const res = await prisma.player.updateMany({
      where: { fangraphsId: c.fangraphsId },
      data: {
        goldGloves: gg,
        ...(c.description ? { description: c.description } : {}),
      },
    });
    updated += res.count;
  }
  const brooks = await prisma.player.findFirst({
    where: { name: "Brooks Robinson" },
  });
  const santo = await prisma.player.findFirst({ where: { name: "Ron Santo" } });
  console.log(`Updated ${updated} player rows`);
  console.log(
    `Brooks ${brooks?.goldGloves ?? "?"} GG · Santo ${santo?.goldGloves ?? "?"} GG`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
