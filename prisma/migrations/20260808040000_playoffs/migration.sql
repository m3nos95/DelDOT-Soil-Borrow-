-- AlterTable
ALTER TABLE "League" ADD COLUMN "seasonNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "round" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Game" ADD COLUMN "seriesId" TEXT;

-- CreateTable
CREATE TABLE "PlayoffSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "highSeedTeamId" TEXT NOT NULL,
    "lowSeedTeamId" TEXT NOT NULL,
    "highSeed" INTEGER NOT NULL,
    "lowSeed" INTEGER NOT NULL,
    "highWins" INTEGER NOT NULL DEFAULT 0,
    "lowWins" INTEGER NOT NULL DEFAULT 0,
    "bestOf" INTEGER NOT NULL DEFAULT 7,
    "winnerTeamId" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayoffSeries_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayoffSeries_leagueId_roundIndex_idx" ON "PlayoffSeries"("leagueId", "roundIndex");

-- CreateTable
CREATE TABLE "Champion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamAbbr" TEXT NOT NULL,
    "runnerUpName" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Champion_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Champion_leagueId_seasonNumber_idx" ON "Champion"("leagueId", "seasonNumber");
