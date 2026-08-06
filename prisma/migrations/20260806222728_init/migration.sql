-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "yearFrom" INTEGER NOT NULL,
    "yearTo" INTEGER NOT NULL,
    "primaryPos" TEXT NOT NULL,
    "positions" TEXT NOT NULL,
    "bats" TEXT NOT NULL,
    "throws" TEXT NOT NULL,
    "salary" INTEGER NOT NULL,
    "isPitcher" BOOLEAN NOT NULL,
    "kRate" REAL NOT NULL,
    "bbRate" REAL NOT NULL,
    "hbpRate" REAL NOT NULL,
    "singleRate" REAL NOT NULL,
    "doubleRate" REAL NOT NULL,
    "tripleRate" REAL NOT NULL,
    "hrRate" REAL NOT NULL,
    "stuff" REAL NOT NULL DEFAULT 50,
    "control" REAL NOT NULL DEFAULT 50,
    "durability" REAL NOT NULL DEFAULT 50,
    "description" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "salaryCap" INTEGER NOT NULL DEFAULT 100000000,
    "maxTeams" INTEGER NOT NULL DEFAULT 6,
    "gamesPerTeam" INTEGER NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "commissionerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "RosterSpot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "RosterSpot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RosterSpot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LineupSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "battingOrder" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    CONSTRAINT "LineupSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LineupSlot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "StaffSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffSlot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "innings" TEXT NOT NULL DEFAULT '[]',
    "playByPlay" TEXT NOT NULL DEFAULT '[]',
    "boxScore" TEXT NOT NULL DEFAULT '{}',
    "homePitcher" TEXT NOT NULL DEFAULT '',
    "awayPitcher" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playedAt" DATETIME,
    CONSTRAINT "Game_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Team_leagueId_ownerId_key" ON "Team"("leagueId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_leagueId_abbreviation_key" ON "Team"("leagueId", "abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "RosterSpot_teamId_playerId_key" ON "RosterSpot"("teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "LineupSlot_teamId_battingOrder_key" ON "LineupSlot"("teamId", "battingOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LineupSlot_teamId_position_key" ON "LineupSlot"("teamId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSlot_teamId_role_key" ON "StaffSlot"("teamId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSlot_teamId_playerId_key" ON "StaffSlot"("teamId", "playerId");
