import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks (antes dos imports do SUT) ───────────────────────────

const mockGetSession = vi.fn();
vi.mock("@empresa/auth", () => ({ getSession: () => mockGetSession() }));

const mockGetThreadAccessByToken = vi.fn();
vi.mock("../../lib/messages/data", () => ({
  getThreadAccessByToken: (...args: unknown[]) =>
    mockGetThreadAccessByToken(...args),
}));

import { resolveThreadActor } from "../../lib/messages/actor";

// ─── Fixtures ───────────────────────────────────────────────────

const TICKET_ID = "ticket_001";

const adminSession = {
  sub: "user_001",
  email: "admin@test.com",
  name: "Admin",
  tenantId: "tenant_001",
  tenantSlug: "acme",
  role: "admin" as const,
  iat: 1000,
  exp: 9999,
};

const threadAccess = {
  id: "ta_001",
  ticketId: TICKET_ID,
  tenantId: "tenant_001",
  token: "valid-thread-token",
  clientName: "Maria",
  clientEmail: "maria@client.com",
  createdAt: new Date(),
};

// ─── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetThreadAccessByToken.mockReset();
});

describe("resolveThreadActor", () => {
  // ── Caminho 1: Sessão de admin ──

  it("retorna actor admin quando há sessão válida", async () => {
    mockGetSession.mockResolvedValue(adminSession);

    const result = await resolveThreadActor(TICKET_ID);

    expect(result).toEqual({
      ok: true,
      actor: {
        kind: "admin",
        userId: "user_001",
        tenantId: "tenant_001",
        name: "Admin",
        tenantSlug: "acme",
      },
    });
  });

  it("prioriza sessão sobre token de thread quando ambos existem", async () => {
    mockGetSession.mockResolvedValue(adminSession);

    const result = await resolveThreadActor(TICKET_ID, "valid-thread-token");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actor.kind).toBe("admin");
    }
    // Não deve nem consultar o token
    expect(mockGetThreadAccessByToken).not.toHaveBeenCalled();
  });

  // ── Caminho 2: Token de thread (cliente) ──

  it("retorna actor client quando token é válido para o ticket", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetThreadAccessByToken.mockResolvedValue(threadAccess);

    const result = await resolveThreadActor(TICKET_ID, "valid-thread-token");

    expect(result).toEqual({
      ok: true,
      actor: {
        kind: "client",
        token: "valid-thread-token",
        tenantId: "tenant_001",
        clientName: "Maria",
      },
    });
  });

  // ── Falhas ──

  it("retorna 401 sem sessão e sem token", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await resolveThreadActor(TICKET_ID);

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: "Autenticação necessária.",
    });
  });

  it("retorna 401 sem sessão e com token inválido", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetThreadAccessByToken.mockResolvedValue(null);

    const result = await resolveThreadActor(TICKET_ID, "bad-token");

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: "Token de thread inválido.",
    });
  });

  it("retorna 403 quando token pertence a outro ticket", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetThreadAccessByToken.mockResolvedValue({
      ...threadAccess,
      ticketId: "ticket_ANOTHER",
    });

    const result = await resolveThreadActor(TICKET_ID, "valid-thread-token");

    expect(result).toEqual({
      ok: false,
      status: 403,
      message: "Token não pertence a este ticket.",
    });
  });

  it("retorna 401 quando token é string vazia", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await resolveThreadActor(TICKET_ID, "");

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: "Autenticação necessária.",
    });
  });
});
