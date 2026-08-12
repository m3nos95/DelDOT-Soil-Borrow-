/**
 * Apply Prisma migration SQL files to a Turso/libSQL database in order.
 *
 * Prisma's schema engine can't push directly to Turso, so we replay the
 * generated migration.sql files and record them in Prisma's
 * `_prisma_migrations` table so `prisma migrate status` stays consistent.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… node scripts/turso-migrate.mjs
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is required.");
  process.exit(1);
}

const client = createClient({ url, authToken });
const migrationsDir = join(process.cwd(), "prisma", "migrations");

function splitStatements(sql) {
  // Naive splitter: strip comments, split on semicolons at line ends.
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    );
  `);
}

async function appliedNames() {
  const res = await client.execute(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
  );
  return new Set(res.rows.map((r) => r.migration_name));
}

async function main() {
  await ensureMigrationsTable();
  const done = await appliedNames();

  const dirs = readdirSync(migrationsDir)
    .filter((name) => statSync(join(migrationsDir, name)).isDirectory())
    .sort();

  let applied = 0;
  for (const name of dirs) {
    if (done.has(name)) {
      console.log(`• skip ${name} (already applied)`);
      continue;
    }
    const file = join(migrationsDir, name, "migration.sql");
    const sql = readFileSync(file, "utf8");
    const statements = splitStatements(sql);
    console.log(`▶ apply ${name} (${statements.length} statements)`);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    const checksum = createHash("sha256").update(sql).digest("hex");
    await client.execute({
      sql: `INSERT INTO "_prisma_migrations"
              (id, checksum, finished_at, migration_name, applied_steps_count)
            VALUES (?, ?, current_timestamp, ?, ?)`,
      args: [crypto.randomUUID(), checksum, name, statements.length],
    });
    applied += 1;
  }

  console.log(
    applied === 0
      ? "Up to date — no migrations applied."
      : `Applied ${applied} migration(s) to Turso.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
