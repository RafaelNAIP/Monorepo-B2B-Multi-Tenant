import type { Tenant, TenantTheme } from "./types";

// ─── Seed data ────────────────────────────────────────────────────

const DEFAULT_THEME: TenantTheme = {
  primaryColor: "#2563eb",
  borderRadius: 8,
  logoUrl: "https://via.placeholder.com/150",
};

const SEED_TENANTS: Tenant[] = [
  {
    id: "t_01",
    name: "Demo Corp",
    slug: "demo",
    subscription: "active",
    theme: { ...DEFAULT_THEME },
    createdAt: "2024-09-01T10:00:00Z",
  },
  {
    id: "t_02",
    name: "Acme Inc",
    slug: "acme",
    subscription: "trial",
    theme: {
      primaryColor: "#dc2626",
      borderRadius: 12,
      logoUrl: "https://via.placeholder.com/150/dc2626",
    },
    createdAt: "2024-09-15T14:00:00Z",
  },
  {
    id: "t_03",
    name: "Empresa Teste",
    slug: "teste",
    subscription: "inactive",
    theme: { ...DEFAULT_THEME },
    createdAt: "2024-10-01T08:00:00Z",
  },
];

// ─── In-memory store ──────────────────────────────────────────────

let tenants: Tenant[] = structuredClone(SEED_TENANTS);

/** Resets the store to initial seed data (used in tests) */
export function resetTenants(): void {
  tenants = structuredClone(SEED_TENANTS);
}

// ─── Public API ───────────────────────────────────────────────────

/** Returns all tenants */
export function getAllTenants(): Tenant[] {
  return tenants;
}

/** Finds a tenant by slug */
export function getTenantBySlug(slug: string): Tenant | undefined {
  return tenants.find((t) => t.slug === slug);
}

/** Finds a tenant by ID */
export function getTenantById(id: string): Tenant | undefined {
  return tenants.find((t) => t.id === id);
}

/** Updates a tenant's theme and name. Returns updated tenant or null if not found. */
export function updateTenantTheme(
  tenantId: string,
  update: { companyName: string; theme: TenantTheme }
): Tenant | null {
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) return null;

  tenant.name = update.companyName;
  tenant.theme = { ...update.theme };

  return tenant;
}
