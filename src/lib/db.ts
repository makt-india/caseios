import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma singleton client.
 * - In development: enables query/warn/error logging
 * - In production: plain client with no logging overhead
 * - Uses global singleton to survive Next.js hot-reloads
 */
let prismaSingleton: PrismaClient;

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!prismaSingleton) {
      prismaSingleton = globalForPrisma.prisma ?? new PrismaClient({
        datasources: {
          db: {
            url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy",
          },
        },
        log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
      });
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = prismaSingleton;
      }
    }
    return (prismaSingleton as any)[prop];
  }
});


