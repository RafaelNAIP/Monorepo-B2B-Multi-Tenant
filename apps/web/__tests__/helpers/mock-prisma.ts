/**
 * Mock helper for PrismaClient used across all domain tests.
 *
 * Usage in test files:
 *   import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";
 *   vi.mock("@empresa/db", () => ({ prisma: prismaMock }));
 *   beforeEach(() => resetPrismaMocks());
 */
import { vi } from "vitest";

// ─── Mock delegate factories ────────────────────────────────────────

function createMockDelegate() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  };
}

// ─── PrismaClient mock ─────────────────────────────────────────────

export const prismaMock = {
  tenant: createMockDelegate(),
  user: createMockDelegate(),
  ticket: createMockDelegate(),
  message: createMockDelegate(),
  threadAccess: createMockDelegate(),
  $transaction: vi.fn((fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)),
};

/** Resets all mocked methods — call in beforeEach */
export function resetPrismaMocks(): void {
  for (const delegate of Object.values(prismaMock)) {
    if (typeof delegate === "object" && delegate !== null) {
      for (const method of Object.values(delegate)) {
        if (typeof method === "function" && "mockReset" in method) {
          (method as ReturnType<typeof vi.fn>).mockReset();
        }
      }
    }
  }
  // Re-setup $transaction default
  prismaMock.$transaction.mockImplementation(
    (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
  );
}
