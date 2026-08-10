-- Snake draft state + league-scoped exclusive roster claims

ALTER TABLE "League" ADD COLUMN "draftPickNumber" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "League" ADD COLUMN "draftRounds" INTEGER NOT NULL DEFAULT 20;

ALTER TABLE "Team" ADD COLUMN "draftOrder" INTEGER NOT NULL DEFAULT 0;

-- Rebuild RosterSpot with leagueId + unique(leagueId, playerId)
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_RosterSpot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "new_RosterSpot_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "new_RosterSpot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "new_RosterSpot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_RosterSpot" ("id", "leagueId", "teamId", "playerId")
SELECT rs."id", t."leagueId", rs."teamId", rs."playerId"
FROM "RosterSpot" rs
INNER JOIN "Team" t ON t."id" = rs."teamId";

DROP TABLE "RosterSpot";
ALTER TABLE "new_RosterSpot" RENAME TO "RosterSpot";

CREATE UNIQUE INDEX "RosterSpot_teamId_playerId_key" ON "RosterSpot"("teamId", "playerId");
CREATE UNIQUE INDEX "RosterSpot_leagueId_playerId_key" ON "RosterSpot"("leagueId", "playerId");
CREATE INDEX "RosterSpot_leagueId_idx" ON "RosterSpot"("leagueId");
CREATE INDEX "Team_leagueId_draftOrder_idx" ON "Team"("leagueId", "draftOrder");

PRAGMA foreign_keys=ON;
