import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

import {
  getUsersByTenant,
  getUserByEmail,
  getUserByEmailAndRole,
  getUserById,
} from "../../lib/users/data";

// ─── Fixtures ────────────────────────────────────────────────────────

const MOCK_USERS_T01 = [
  {
    id: "u_01",
    name: "Usuário Demo",
    email: "admin@demo.com",
    role: "admin",
    tenantId: "t_01",
    createdAt: new Date("2024-10-01T10:00:00Z"),
  },
  {
    id: "u_02",
    name: "Cliente Demo",
    email: "cliente@demo.com",
    role: "client",
    tenantId: "t_01",
    createdAt: new Date("2024-10-05T14:00:00Z"),
  },
];

const MOCK_USERS_T02 = [
  {
    id: "u_03",
    name: "Admin Tenant2",
    email: "admin@acme.com",
    role: "admin",
    tenantId: "t_02",
    createdAt: new Date("2024-10-10T09:00:00Z"),
  },
  {
    id: "u_04",
    name: "Cliente Tenant2",
    email: "cliente@acme.com",
    role: "client",
    tenantId: "t_02",
    createdAt: new Date("2024-10-12T11:00:00Z"),
  },
];

beforeEach(() => {
  resetPrismaMocks();
});

// ─── getUsersByTenant ───────────────────────────────────────────────

describe("getUsersByTenant", () => {
  it("retorna todos os usuários do tenant t_01", async () => {
    prismaMock.user.findMany.mockResolvedValue(MOCK_USERS_T01);

    const users = await getUsersByTenant("t_01");
    expect(users.length).toBe(2);
    expect(users.every((u) => u.tenantId === "t_01")).toBe(true);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { tenantId: "t_01" },
    });
  });

  it("retorna todos os usuários do tenant t_02", async () => {
    prismaMock.user.findMany.mockResolvedValue(MOCK_USERS_T02);

    const users = await getUsersByTenant("t_02");
    expect(users.length).toBe(2);
    expect(users.every((u) => u.tenantId === "t_02")).toBe(true);
  });

  it("retorna array vazio para tenant inexistente", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);

    const users = await getUsersByTenant("t_99");
    expect(users).toEqual([]);
  });

  it("isola dados entre tenants", async () => {
    prismaMock.user.findMany
      .mockResolvedValueOnce(MOCK_USERS_T01)
      .mockResolvedValueOnce(MOCK_USERS_T02);

    const t1 = await getUsersByTenant("t_01");
    const t2 = await getUsersByTenant("t_02");
    const t1Ids = t1.map((u) => u.id);
    const t2Ids = t2.map((u) => u.id);
    expect(t1Ids.some((id) => t2Ids.includes(id))).toBe(false);
    // O isolamento vem do filtro enviado ao banco, não só dos dados do mock
    expect(prismaMock.user.findMany).toHaveBeenNthCalledWith(1, {
      where: { tenantId: "t_01" },
    });
    expect(prismaMock.user.findMany).toHaveBeenNthCalledWith(2, {
      where: { tenantId: "t_02" },
    });
  });
});

// ─── getUserByEmail ─────────────────────────────────────────────────

describe("getUserByEmail", () => {
  it("encontra usuário por e-mail e tenant", async () => {
    prismaMock.user.findFirst.mockResolvedValue(MOCK_USERS_T01[0]);

    const user = await getUserByEmail("admin@demo.com", "t_01");
    expect(user).toBeDefined();
    expect(user!.email).toBe("admin@demo.com");
    expect(user!.tenantId).toBe("t_01");
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { email: "admin@demo.com", tenantId: "t_01" },
    });
  });

  it("não encontra usuário de outro tenant", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const user = await getUserByEmail("admin@demo.com", "t_02");
    expect(user).toBeNull();
  });

  it("busca é case-insensitive no e-mail", async () => {
    prismaMock.user.findFirst.mockResolvedValue(MOCK_USERS_T01[0]);

    const user = await getUserByEmail("ADMIN@DEMO.COM", "t_01");
    expect(user).toBeDefined();
    // Verify lowercase is passed to Prisma
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { email: "admin@demo.com", tenantId: "t_01" },
    });
  });

  it("retorna null para e-mail inexistente", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const user = await getUserByEmail("naoexiste@demo.com", "t_01");
    expect(user).toBeNull();
  });
});

// ─── getUserByEmailAndRole ──────────────────────────────────────────

describe("getUserByEmailAndRole", () => {
  it("encontra admin por e-mail, tenant e role", async () => {
    prismaMock.user.findFirst.mockResolvedValue(MOCK_USERS_T01[0]);

    const user = await getUserByEmailAndRole("admin@demo.com", "t_01", "admin");
    expect(user).toBeDefined();
    expect(user!.role).toBe("admin");
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { email: "admin@demo.com", tenantId: "t_01", role: "admin" },
    });
  });

  it("encontra client por e-mail, tenant e role", async () => {
    prismaMock.user.findFirst.mockResolvedValue(MOCK_USERS_T01[1]);

    const user = await getUserByEmailAndRole("cliente@demo.com", "t_01", "client");
    expect(user).toBeDefined();
    expect(user!.role).toBe("client");
  });

  it("não encontra se role não bate", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const user = await getUserByEmailAndRole("admin@demo.com", "t_01", "client");
    expect(user).toBeNull();
  });

  it("não encontra se tenant não bate", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const user = await getUserByEmailAndRole("admin@demo.com", "t_02", "admin");
    expect(user).toBeNull();
  });
});

// ─── getUserById ────────────────────────────────────────────────────

describe("getUserById", () => {
  it("encontra usuário por ID", async () => {
    prismaMock.user.findUnique.mockResolvedValue(MOCK_USERS_T01[0]);

    const user = await getUserById("u_01");
    expect(user).toBeDefined();
    expect(user!.id).toBe("u_01");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u_01" },
    });
  });

  it("retorna null para ID inexistente", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const user = await getUserById("u_99");
    expect(user).toBeNull();
  });
});
