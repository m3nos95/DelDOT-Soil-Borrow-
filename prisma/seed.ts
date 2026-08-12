import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { makePrismaClient, targetLabel } from "../scripts/prisma-client";
import { salaryFromValue } from "../scripts/recompute-salaries";

const prisma = makePrismaClient();
console.log(`Seeding → ${targetLabel}`);

type CareerPlayer = {
  fangraphsId: number;
  name: string;
  yearFrom: number;
  yearTo: number;
  primaryPos: string;
  positions: string[];
  bats: string;
  throws: string;
  salary: number;
  isPitcher: boolean;
  kRate: number;
  bbRate: number;
  hbpRate: number;
  singleRate: number;
  doubleRate: number;
  tripleRate: number;
  hrRate: number;
  stuff: number;
  control: number;
  durability: number;
  careerWAR?: number;
  careerPA?: number;
  careerIP?: number;
  goldGloves?: number;
  description: string;
};

function playingTime(p: CareerPlayer): number {
  if (p.isPitcher) {
    if (p.careerIP != null) return p.careerIP;
    const m = p.description?.match(/([\d.]+)\s*IP/);
    return m ? Number(m[1]) : 0;
  }
  if (p.careerPA != null) return p.careerPA;
  const m = p.description?.match(/(\d+)\s*PA/);
  return m ? Number(m[1]) : 0;
}

async function seedPlayers() {
  const jsonPath = path.join(process.cwd(), "data", "career_players.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `Missing ${jsonPath}. Run: python3 scripts/ingest_fangraphs_careers.py`,
    );
  }

  const players = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as CareerPlayer[];
  console.log(`Loading ${players.length} career players…`);

  // Always recompute salary from WAR + playing time so tiny samples can't
  // ship at Andruw Jones money if the JSON was built with an older formula.
  for (const p of players) {
    p.salary = salaryFromValue(p.careerWAR ?? 0, playingTime(p), p.isPitcher);
  }

  // Replace pool (leagues referencing old players must be cleared by reseed script)
  await prisma.player.deleteMany();

  const chunkSize = 500;
  for (let i = 0; i < players.length; i += chunkSize) {
    const chunk = players.slice(i, i + chunkSize);
    await prisma.player.createMany({
      data: chunk.map((p) => ({
        fangraphsId: p.fangraphsId,
        name: p.name,
        yearFrom: p.yearFrom,
        yearTo: p.yearTo,
        primaryPos: p.primaryPos,
        positions: (p.positions ?? [p.primaryPos]).join(","),
        bats: p.bats || "R",
        throws: p.throws || "R",
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
        careerWAR: p.careerWAR ?? 0,
        goldGloves: p.goldGloves ?? 0,
        description: p.description ?? "",
      })),
    });
    if ((i + chunkSize) % 2000 < chunkSize) {
      console.log(`  …${Math.min(i + chunkSize, players.length)} / ${players.length}`);
    }
  }
  console.log(`Seeded ${players.length} players (one career card each)`);
}

async function main() {
  await seedPlayers();

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
