import type { User } from "./types";
import type { UserRole } from "./constants";

// ─── Seed data ────────────────────────────────────────────────────

const SEED_USERS: User[] = [
  {
    id: "u_01",
    name: "Usuário Demo",
    email: "admin@demo.com",
    role: "admin",
    tenantId: "t_01",
    createdAt: "2024-10-01T10:00:00Z",
  },
  {
    id: "u_02",
    name: "Cliente Demo",
    email: "cliente@demo.com",
    role: "client",
    tenantId: "t_01",
    createdAt: "2024-10-05T14:00:00Z",
  },
  {
    id: "u_03",
    name: "Admin Tenant2",
    email: "admin@acme.com",
    role: "admin",
    tenantId: "t_02",
    createdAt: "2024-10-10T09:00:00Z",
  },
  {
    id: "u_04",
    name: "Cliente Tenant2",
    email: "cliente@acme.com",
    role: "client",
    tenantId: "t_02",
    createdAt: "2024-10-12T11:00:00Z",
  },
];

// ─── In-memory store ──────────────────────────────────────────────

let users: User[] = structuredClone(SEED_USERS);

/** Resets the store to initial seed data (used in tests) */
export function resetUsers(): void {
  users = structuredClone(SEED_USERS);
}

// ─── Public API ───────────────────────────────────────────────────

/** Returns all users for a given tenant */
export function getUsersByTenant(tenantId: string): User[] {
  return users.filter((u) => u.tenantId === tenantId);
}

/** Finds a user by email and tenant */
export function getUserByEmail(
  email: string,
  tenantId: string
): User | undefined {
  return users.find(
    (u) => u.email === email.toLowerCase() && u.tenantId === tenantId
  );
}

/** Finds a user by email, tenant and role */
export function getUserByEmailAndRole(
  email: string,
  tenantId: string,
  role: UserRole
): User | undefined {
  return users.find(
    (u) =>
      u.email === email.toLowerCase() &&
      u.tenantId === tenantId &&
      u.role === role
  );
}

/** Finds a user by ID */
export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}
