-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "salaryCap" INTEGER NOT NULL DEFAULT 120000000,
    "maxTeams" INTEGER NOT NULL DEFAULT 6,
    "gamesPerTeam" INTEGER NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "commissionerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_League" ("commissionerId", "createdAt", "gamesPerTeam", "id", "inviteCode", "maxTeams", "name", "salaryCap", "status") SELECT "commissionerId", "createdAt", "gamesPerTeam", "id", "inviteCode", "maxTeams", "name", "salaryCap", "status" FROM "League";
DROP TABLE "League";
ALTER TABLE "new_League" RENAME TO "League";
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
