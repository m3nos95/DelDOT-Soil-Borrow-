-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isCpu" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "park" TEXT NOT NULL DEFAULT 'Generic Park',
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "runsFor" INTEGER NOT NULL DEFAULT 0,
    "runsAgainst" INTEGER NOT NULL DEFAULT 0,
    "draftReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("abbreviation", "createdAt", "draftReady", "id", "leagueId", "losses", "name", "ownerId", "park", "runsAgainst", "runsFor", "wins")
SELECT "abbreviation", "createdAt", "draftReady", "id", "leagueId", "losses", "name", "ownerId", "park", "runsAgainst", "runsFor", "wins" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_leagueId_abbreviation_key" ON "Team"("leagueId", "abbreviation");
CREATE INDEX "Team_leagueId_ownerId_idx" ON "Team"("leagueId", "ownerId");

CREATE TABLE "new_League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "salaryCap" INTEGER NOT NULL DEFAULT 120000000,
    "maxTeams" INTEGER NOT NULL DEFAULT 6,
    "gamesPerTeam" INTEGER NOT NULL DEFAULT 162,
    "era" TEXT NOT NULL DEFAULT 'modern',
    "status" TEXT NOT NULL DEFAULT 'forming',
    "commissionerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_League" ("commissionerId", "createdAt", "era", "gamesPerTeam", "id", "inviteCode", "maxTeams", "name", "salaryCap", "status")
SELECT "commissionerId", "createdAt", "era", "gamesPerTeam", "id", "inviteCode", "maxTeams", "name", "salaryCap", "status" FROM "League";
DROP TABLE "League";
ALTER TABLE "new_League" RENAME TO "League";
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");

CREATE TABLE "SeasonBattingStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "g" INTEGER NOT NULL DEFAULT 0,
    "ab" INTEGER NOT NULL DEFAULT 0,
    "r" INTEGER NOT NULL DEFAULT 0,
    "h" INTEGER NOT NULL DEFAULT 0,
    "rbi" INTEGER NOT NULL DEFAULT 0,
    "bb" INTEGER NOT NULL DEFAULT 0,
    "so" INTEGER NOT NULL DEFAULT 0,
    "hr" INTEGER NOT NULL DEFAULT 0,
    "sb" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SeasonBattingStat_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonBattingStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonBattingStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SeasonBattingStat_leagueId_teamId_playerId_key" ON "SeasonBattingStat"("leagueId", "teamId", "playerId");
CREATE INDEX "SeasonBattingStat_leagueId_hr_idx" ON "SeasonBattingStat"("leagueId", "hr");
CREATE INDEX "SeasonBattingStat_leagueId_h_idx" ON "SeasonBattingStat"("leagueId", "h");

CREATE TABLE "SeasonPitchingStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "g" INTEGER NOT NULL DEFAULT 0,
    "gs" INTEGER NOT NULL DEFAULT 0,
    "outs" INTEGER NOT NULL DEFAULT 0,
    "h" INTEGER NOT NULL DEFAULT 0,
    "r" INTEGER NOT NULL DEFAULT 0,
    "er" INTEGER NOT NULL DEFAULT 0,
    "bb" INTEGER NOT NULL DEFAULT 0,
    "so" INTEGER NOT NULL DEFAULT 0,
    "hr" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 0,
    "l" INTEGER NOT NULL DEFAULT 0,
    "sv" INTEGER NOT NULL DEFAULT 0,
    "hld" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SeasonPitchingStat_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonPitchingStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeasonPitchingStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SeasonPitchingStat_leagueId_teamId_playerId_key" ON "SeasonPitchingStat"("leagueId", "teamId", "playerId");
CREATE INDEX "SeasonPitchingStat_leagueId_so_idx" ON "SeasonPitchingStat"("leagueId", "so");
CREATE INDEX "SeasonPitchingStat_leagueId_w_idx" ON "SeasonPitchingStat"("leagueId", "w");

CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "proposerTeamId" TEXT NOT NULL,
    "partnerTeamId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "Trade_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Trade_proposerTeamId_fkey" FOREIGN KEY ("proposerTeamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Trade_partnerTeamId_fkey" FOREIGN KEY ("partnerTeamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Trade_leagueId_status_idx" ON "Trade"("leagueId", "status");

CREATE TABLE "TradeAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "fromTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "TradeAsset_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeAsset_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeAsset_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Player_isPitcher_careerWAR_idx" ON "Player"("isPitcher", "careerWAR");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
