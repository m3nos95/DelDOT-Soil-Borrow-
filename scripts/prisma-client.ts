import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Build a PrismaClient for CLI scripts (seed, tests, tools).
 * Targets Turso/libSQL when TURSO_DATABASE_URL is set, else the local file.
 */
export function makePrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    const { PrismaLibSql } = require("@prisma/adapter-libsql");
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

export const targetLabel = process.env.TURSO_DATABASE_URL
  ? `Turso (${process.env.TURSO_DATABASE_URL})`
  : `local (${process.env.DATABASE_URL ?? "file:./prisma/dev.db"})`;
