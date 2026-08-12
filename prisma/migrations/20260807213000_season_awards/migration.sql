-- CreateTable
CREATE TABLE "SeasonAward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "award" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "circuit" TEXT NOT NULL DEFAULT 'LEAGUE',
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "score" REAL NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeasonAward_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonAward_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SeasonAward_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonAward_leagueId_award_position_circuit_key" ON "SeasonAward"("leagueId", "award", "position", "circuit");

-- CreateIndex
CREATE INDEX "SeasonAward_leagueId_award_idx" ON "SeasonAward"("leagueId", "award");
