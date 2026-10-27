import { PrismaClient } from "@prisma/client";

// Singleton pattern com globalThis para evitar múltiplas instâncias em dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-exporta todos os tipos gerados pelo Prisma
export * from "@prisma/client";
export type { PrismaClient } from "@prisma/client";
