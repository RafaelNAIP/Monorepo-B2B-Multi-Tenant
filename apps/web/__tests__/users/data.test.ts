import { describe, it, expect, beforeEach } from "vitest";

import {
  resetUsers,
  getUsersByTenant,
  getUserByEmail,
  getUserByEmailAndRole,
  getUserById,
} from "../../lib/users/data";

beforeEach(() => {
  resetUsers();
});

// ─── getUsersByTenant ───────────────────────────────────────────────

describe("getUsersByTenant", () => {
  it("retorna todos os usuários do tenant t_01", () => {
    const users = getUsersByTenant("t_01");
    expect(users.length).toBe(2);
    expect(users.every((u) => u.tenantId === "t_01")).toBe(true);
  });

  it("retorna todos os usuários do tenant t_02", () => {
    const users = getUsersByTenant("t_02");
    expect(users.length).toBe(2);
    expect(users.every((u) => u.tenantId === "t_02")).toBe(true);
  });

  it("retorna array vazio para tenant inexistente", () => {
    const users = getUsersByTenant("t_99");
    expect(users).toEqual([]);
  });

  it("isola dados entre tenants", () => {
    const t1 = getUsersByTenant("t_01");
    const t2 = getUsersByTenant("t_02");
    const t1Ids = t1.map((u) => u.id);
    const t2Ids = t2.map((u) => u.id);
    expect(t1Ids.some((id) => t2Ids.includes(id))).toBe(false);
  });
});

// ─── getUserByEmail ─────────────────────────────────────────────────

describe("getUserByEmail", () => {
  it("encontra usuário por e-mail e tenant", () => {
    const user = getUserByEmail("admin@demo.com", "t_01");
    expect(user).toBeDefined();
    expect(user!.email).toBe("admin@demo.com");
    expect(user!.tenantId).toBe("t_01");
  });

  it("não encontra usuário de outro tenant", () => {
    const user = getUserByEmail("admin@demo.com", "t_02");
    expect(user).toBeUndefined();
  });

  it("busca é case-insensitive no e-mail", () => {
    const user = getUserByEmail("ADMIN@DEMO.COM", "t_01");
    expect(user).toBeDefined();
    expect(user!.email).toBe("admin@demo.com");
  });

  it("retorna undefined para e-mail inexistente", () => {
    const user = getUserByEmail("naoexiste@demo.com", "t_01");
    expect(user).toBeUndefined();
  });
});

// ─── getUserByEmailAndRole ──────────────────────────────────────────

describe("getUserByEmailAndRole", () => {
  it("encontra admin por e-mail, tenant e role", () => {
    const user = getUserByEmailAndRole("admin@demo.com", "t_01", "admin");
    expect(user).toBeDefined();
    expect(user!.role).toBe("admin");
  });

  it("encontra client por e-mail, tenant e role", () => {
    const user = getUserByEmailAndRole("cliente@demo.com", "t_01", "client");
    expect(user).toBeDefined();
    expect(user!.role).toBe("client");
  });

  it("não encontra se role não bate", () => {
    const user = getUserByEmailAndRole("admin@demo.com", "t_01", "client");
    expect(user).toBeUndefined();
  });

  it("não encontra se tenant não bate", () => {
    const user = getUserByEmailAndRole("admin@demo.com", "t_02", "admin");
    expect(user).toBeUndefined();
  });
});

// ─── getUserById ────────────────────────────────────────────────────

describe("getUserById", () => {
  it("encontra usuário por ID", () => {
    const user = getUserById("u_01");
    expect(user).toBeDefined();
    expect(user!.id).toBe("u_01");
  });

  it("retorna undefined para ID inexistente", () => {
    const user = getUserById("u_99");
    expect(user).toBeUndefined();
  });
});
