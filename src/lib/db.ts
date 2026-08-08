import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Chooses a database adapter based on environment:
 *  - Turso / libSQL when TURSO_DATABASE_URL is set (serverless prod, e.g. Vercel)
 *  - local better-sqlite3 file otherwise (dev, seeds, test scripts)
 */
function createClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;

  if (tursoUrl) {
    // Lazy require so local/dev never needs the libSQL bits loaded.
    const {
      PrismaLibSql,
    } = require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  const {
    PrismaBetterSqlite3,
  } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
