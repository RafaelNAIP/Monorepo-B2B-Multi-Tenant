import { prisma } from "@empresa/db";

import type { TenantTheme } from "./types";

// ─── Public API ───────────────────────────────────────────────────

/** Returns all tenants */
export async function getAllTenants() {
  return prisma.tenant.findMany();
}

/** Finds a tenant by slug */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } });
}

/** Finds a tenant by ID */
export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({ where: { id } });
}

/** Updates a tenant's theme and name. Returns updated tenant or null if not found. */
export async function updateTenantTheme(
  tenantId: string,
  update: { companyName: string; theme: TenantTheme }
) {
  try {
    return await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: update.companyName,
        theme: update.theme,
      },
    });
  } catch {
    return null;
  }
}
