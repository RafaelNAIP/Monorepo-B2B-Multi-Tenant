import { prisma } from "@empresa/db";

import type { UserRole } from "./constants";

// ─── Public API ───────────────────────────────────────────────────

/** Returns all users for a given tenant */
export async function getUsersByTenant(tenantId: string) {
  return prisma.user.findMany({ where: { tenantId } });
}

/** Finds a user by email and tenant */
export async function getUserByEmail(email: string, tenantId: string) {
  return prisma.user.findFirst({
    where: { email: email.toLowerCase(), tenantId },
  });
}

/** Finds a user by email, tenant and role */
export async function getUserByEmailAndRole(
  email: string,
  tenantId: string,
  role: UserRole
) {
  return prisma.user.findFirst({
    where: { email: email.toLowerCase(), tenantId, role },
  });
}

/** Finds a user by ID */
export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
