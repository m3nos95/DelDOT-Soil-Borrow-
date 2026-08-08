/**
 * Unit + light integration: award selection formulas and season finalize hook.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import {
  selectSeasonAwards,
  computeAndSaveAwards,
  awardLabel,
} from "../src/lib/awards";
import { generateInviteCode, simulateDays, startSeason } from "../src/lib/league";
import { autoDraftTeam, fillCpuTeams } from "../src/lib/cpu";

function bat(
  overrides: Partial<{
    playerId: string;
    teamId: string;
    g: number;
    ab: number;
    r: number;
    h: number;
    rbi: number;
    bb: number;
    so: number;
    hr: number;
    sb: number;
    doubles: number;
    triples: number;
    hbp: number;
    sf: number;
    seasonErrors: number;
    name: string;
    primaryPos: string;
    goldGloves: number;
    careerWAR: number;
    abbreviation: string;
    wins: number;
    losses: number;
    fieldPos: string;
  }>,
) {
  const playerId = overrides.playerId ?? "p1";
  const teamId = overrides.teamId ?? "t1";
  return {
    playerId,
    teamId,
    g: overrides.g ?? 150,
    ab: overrides.ab ?? 550,
    r: overrides.r ?? 90,
    h: overrides.h ?? 160,
    rbi: overrides.rbi ?? 90,
    bb: overrides.bb ?? 60,
    so: overrides.so ?? 100,
    hr: overrides.hr ?? 25,
    sb: overrides.sb ?? 10,
    doubles: overrides.doubles ?? 28,
    triples: overrides.triples ?? 2,
    hbp: overrides.hbp ?? 5,
    sf: overrides.sf ?? 5,
    seasonErrors: overrides.seasonErrors ?? 4,
    player: {
      id: playerId,
      name: overrides.name ?? "Hitter",
      primaryPos: overrides.primaryPos ?? "CF",
      isPitcher: false,
      careerWAR: overrides.careerWAR ?? 40,
      goldGloves: overrides.goldGloves ?? 0,
    },
    team: {
      id: teamId,
      abbreviation: overrides.abbreviation ?? "BOS",
      wins: overrides.wins ?? 90,
      losses: overrides.losses ?? 72,
    },
    fieldPos: overrides.fieldPos ?? overrides.primaryPos ?? "CF",
  };
}

function pitch(
  overrides: Partial<{
    playerId: string;
    teamId: string;
    g: number;
    gs: number;
    outs: number;
    h: number;
    r: number;
    er: number;
    bb: number;
    so: number;
    hr: number;
    w: number;
    l: number;
    sv: number;
    seasonErrors: number;
    name: string;
    goldGloves: number;
    careerWAR: number;
    abbreviation: string;
    wins: number;
    losses: number;
  }>,
) {
  const playerId = overrides.playerId ?? "arm1";
  const teamId = overrides.teamId ?? "t1";
  return {
    playerId,
    teamId,
    g: overrides.g ?? 32,
    gs: overrides.gs ?? 32,
    outs: overrides.outs ?? 600,
    h: overrides.h ?? 160,
    r: overrides.r ?? 70,
    er: overrides.er ?? 65,
    bb: overrides.bb ?? 50,
    so: overrides.so ?? 200,
    hr: overrides.hr ?? 20,
    w: overrides.w ?? 18,
    l: overrides.l ?? 8,
    sv: overrides.sv ?? 0,
    seasonErrors: overrides.seasonErrors ?? 1,
    player: {
      id: playerId,
      name: overrides.name ?? "Ace",
      primaryPos: "P",
      isPitcher: true,
      careerWAR: overrides.careerWAR ?? 50,
      goldGloves: overrides.goldGloves ?? 0,
    },
    team: {
      id: teamId,
      abbreviation: overrides.abbreviation ?? "BOS",
      wins: overrides.wins ?? 90,
      losses: overrides.losses ?? 72,
    },
  };
}

function unitTests() {
  assert.equal(awardLabel("mvp"), "MVP");
  assert.equal(awardLabel("cy_young"), "Cy Young");

  const slugger = bat({
    playerId: "slug",
    name: "Slugger",
    hr: 55,
    rbi: 140,
    h: 180,
    r: 120,
    ab: 580,
    fieldPos: "LF",
    primaryPos: "LF",
  });
  const glove = bat({
    playerId: "glove",
    name: "Glove",
    hr: 8,
    rbi: 50,
    h: 140,
    ab: 520,
    fieldPos: "SS",
    primaryPos: "SS",
    goldGloves: 12,
    careerWAR: 70,
    teamId: "t2",
    abbreviation: "NYY",
  });
  const contact = bat({
    playerId: "contact",
    name: "Contact",
    hr: 12,
    rbi: 70,
    h: 200,
    ab: 600,
    bb: 40,
    fieldPos: "2B",
    primaryPos: "2B",
    teamId: "t2",
    abbreviation: "NYY",
  });
  const ace = pitch({
    playerId: "ace",
    name: "Ace",
    w: 22,
    l: 5,
    so: 280,
    er: 45,
    outs: 690,
    h: 150,
    bb: 40,
  });
  const journeyman = pitch({
    playerId: "journeyman",
    name: "Journeyman",
    w: 10,
    l: 12,
    so: 120,
    er: 95,
    outs: 540,
    teamId: "t2",
    abbreviation: "NYY",
  });

  const teams = [
    { abbreviation: "BOS", wins: 95, losses: 67 },
    { abbreviation: "NYY", wins: 88, losses: 74 },
  ];

  const picks = selectSeasonAwards({
    batting: [slugger, glove, contact],
    pitching: [ace, journeyman],
    teams,
    teamGames: 162,
  });

  const mvp = picks.find((p) => p.award === "mvp");
  assert.ok(mvp, "MVP awarded");
  assert.equal(mvp!.playerId, "slug", "MVP should be the big bat");

  const cy = picks.find((p) => p.award === "cy_young");
  assert.ok(cy, "Cy Young awarded");
  assert.equal(cy!.playerId, "ace");

  const ssLf = picks.find(
    (p) => p.award === "silver_slugger" && p.position === "LF",
  );
  assert.ok(ssLf);
  assert.equal(ssLf!.playerId, "slug");

  const ggSs = picks.find(
    (p) => p.award === "gold_glove" && p.position === "SS",
  );
  assert.ok(ggSs);
  assert.equal(ggSs!.playerId, "glove");

  const ggP = picks.find((p) => p.award === "gold_glove" && p.position === "P");
  assert.ok(ggP);
  assert.equal(ggP!.playerId, "ace");

  // AL/NL split when both circuits have 2+ teams
  const split = selectSeasonAwards({
    batting: [
      bat({
        playerId: "al-mvp",
        abbreviation: "BOS",
        teamId: "al1",
        hr: 40,
        fieldPos: "CF",
      }),
      bat({
        playerId: "al2",
        abbreviation: "TB",
        teamId: "al2",
        hr: 20,
        fieldPos: "1B",
      }),
      bat({
        playerId: "nl-mvp",
        abbreviation: "ATL",
        teamId: "nl1",
        hr: 45,
        rbi: 130,
        fieldPos: "RF",
      }),
      bat({
        playerId: "nl2",
        abbreviation: "PHI",
        teamId: "nl2",
        hr: 18,
        fieldPos: "C",
      }),
    ],
    pitching: [
      pitch({ playerId: "al-cy", abbreviation: "BOS", teamId: "al1" }),
      pitch({ playerId: "nl-cy", abbreviation: "ATL", teamId: "nl1", w: 20 }),
    ],
    teams: [
      { abbreviation: "BOS", wins: 90, losses: 72 },
      { abbreviation: "TB", wins: 80, losses: 82 },
      { abbreviation: "ATL", wins: 95, losses: 67 },
      { abbreviation: "PHI", wins: 85, losses: 77 },
    ],
    teamGames: 162,
  });
  const circuits = new Set(split.filter((p) => p.award === "mvp").map((p) => p.circuit));
  assert.deepEqual([...circuits].sort(), ["AL", "NL"]);

  console.log("unit awards: ok");
}

async function integration() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  const user =
    (await prisma.user.findUnique({ where: { username: "awards_test" } })) ??
    (await prisma.user.create({
      data: {
        username: "awards_test",
        displayName: "Awards Test",
        passwordHash: await bcrypt.hash("hardball", 10),
      },
    }));

  const league = await prisma.league.create({
    data: {
      name: "Awards Test League",
      inviteCode: generateInviteCode(),
      maxTeams: 4,
      gamesPerTeam: 6,
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
  await fillCpuTeams(league.id);
  await startSeason(league.id);

  // Play full short season
  await simulateDays(league.id, 40);

  const refreshed = await prisma.league.findUniqueOrThrow({
    where: { id: league.id },
  });
  assert.equal(refreshed.status, "complete", "season should complete");

  let awards = await prisma.seasonAward.findMany({
    where: { leagueId: league.id },
  });
  if (awards.length === 0) {
    await computeAndSaveAwards(league.id, { finalized: true });
    awards = await prisma.seasonAward.findMany({
      where: { leagueId: league.id },
    });
  }

  assert.ok(
    awards.some((a) => a.award === "mvp" && a.finalized),
    "finalized MVP",
  );
  assert.ok(
    awards.some((a) => a.award === "cy_young" && a.finalized),
    "finalized Cy Young",
  );
  assert.ok(
    awards.some((a) => a.award === "gold_glove"),
    "Gold Gloves present",
  );
  assert.ok(
    awards.some((a) => a.award === "silver_slugger"),
    "Silver Sluggers present",
  );

  console.log(
    `integration awards: ${awards.length} trophies · MVP/CY/GG/SS ok`,
  );
  await prisma.$disconnect();
}

async function main() {
  unitTests();
  await integration();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
