import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock do getSession ─────────────────────────────────────────
const mockGetSession = vi.fn();

vi.mock("../../../../packages/auth/src/lib/session", () => ({
  getSession: () => mockGetSession(),
}));

beforeEach(() => {
  mockGetSession.mockReset();
});

import { requireSession } from "../../../../packages/auth/src/lib/actor";
import type { SessionPayload } from "../../../../packages/auth/src/lib/payload";

const validSession: SessionPayload = {
  sub: "507f1f77bcf86cd799439011",
  email: "admin@demo.com",
  name: "João Admin",
  tenantId: "507f1f77bcf86cd799439012",
  tenantSlug: "demo",
  role: "admin",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 2592000,
};

describe("requireSession — sem filtro de role", () => {
  it("retorna ok: true com sessão válida", async () => {
    mockGetSession.mockResolvedValue(validSession);
    const result = await requireSession();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toEqual(validSession);
    }
  });

  it("retorna ok: false com errorState quando não há sessão", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await requireSession();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorState).toBeDefined();
      expect(result.errorState.success).toBe(false);
      expect(result.errorState.error).toBeTruthy();
      expect(typeof result.errorState.error).toBe("string");
    }
  });
});

describe("requireSession — com filtro de role", () => {
  it("retorna ok: true quando role corresponde", async () => {
    mockGetSession.mockResolvedValue(validSession); // role: "admin"
    const result = await requireSession({ role: "admin" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.role).toBe("admin");
    }
  });

  it("retorna ok: false quando role não corresponde", async () => {
    mockGetSession.mockResolvedValue(validSession); // role: "admin"
    const result = await requireSession({ role: "client" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorState.success).toBe(false);
      expect(result.errorState.error).toBeTruthy();
    }
  });

  it("retorna ok: false para role inválida com sessão nula", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await requireSession({ role: "admin" });

    expect(result.ok).toBe(false);
  });
});

describe("requireSession — tipagem de retorno", () => {
  it("ok: true contém session e NÃO contém errorState", async () => {
    mockGetSession.mockResolvedValue(validSession);
    const result = await requireSession();

    if (result.ok) {
      expect(result).toHaveProperty("session");
      expect(result).not.toHaveProperty("errorState");
    }
  });

  it("ok: false contém errorState e NÃO contém session", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await requireSession();

    if (!result.ok) {
      expect(result).toHaveProperty("errorState");
      expect(result).not.toHaveProperty("session");
    }
  });

  it("errorState tem a mesma shape do ActionState", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await requireSession();

    if (!result.ok) {
      expect(result.errorState).toHaveProperty("success");
      expect(result.errorState).toHaveProperty("error");
      expect(result.errorState).toHaveProperty("fieldErrors");
      expect(result.errorState.fieldErrors).toEqual({});
    }
  });
});

describe("requireSession — roles client", () => {
  const clientSession: SessionPayload = {
    ...validSession,
    role: "client",
    email: "user@client.com",
    name: "Maria Client",
  };

  it("retorna ok: true para role client quando requisitado", async () => {
    mockGetSession.mockResolvedValue(clientSession);
    const result = await requireSession({ role: "client" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.role).toBe("client");
    }
  });

  it("retorna ok: false para role admin quando é client", async () => {
    mockGetSession.mockResolvedValue(clientSession);
    const result = await requireSession({ role: "admin" });

    expect(result.ok).toBe(false);
  });
});
