-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fangraphsId" INTEGER,
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
    "careerWAR" REAL NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Player" ("bats", "bbRate", "control", "description", "doubleRate", "durability", "hbpRate", "hrRate", "id", "isPitcher", "kRate", "name", "positions", "primaryPos", "salary", "singleRate", "stuff", "throws", "tripleRate", "yearFrom", "yearTo") SELECT "bats", "bbRate", "control", "description", "doubleRate", "durability", "hbpRate", "hrRate", "id", "isPitcher", "kRate", "name", "positions", "primaryPos", "salary", "singleRate", "stuff", "throws", "tripleRate", "yearFrom", "yearTo" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_fangraphsId_key" ON "Player"("fangraphsId");
CREATE INDEX "Player_name_idx" ON "Player"("name");
CREATE INDEX "Player_isPitcher_salary_idx" ON "Player"("isPitcher", "salary");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
