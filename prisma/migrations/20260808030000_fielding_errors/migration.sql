-- AlterTable
ALTER TABLE "Team" ADD COLUMN "errors" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SeasonFieldingStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "pos" TEXT NOT NULL DEFAULT '',
    "errors" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SeasonFieldingStat_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonFieldingStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonFieldingStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonFieldingStat_leagueId_teamId_playerId_key" ON "SeasonFieldingStat"("leagueId", "teamId", "playerId");

-- CreateIndex
CREATE INDEX "SeasonFieldingStat_leagueId_idx" ON "SeasonFieldingStat"("leagueId");
