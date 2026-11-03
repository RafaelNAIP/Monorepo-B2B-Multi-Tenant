import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mock do token.ts (edge-safe) ───────────────────────────────
const mockVerifySessionToken = vi.fn();

vi.mock("../../../../packages/auth/src/lib/token", () => ({
  verifySessionToken: (...args: unknown[]) => mockVerifySessionToken(...args),
}));

// ─── Mock do env ────────────────────────────────────────────────
const MOCK_SECRET = "test-secret-key-for-middleware-at-least-32!!";

beforeEach(() => {
  mockVerifySessionToken.mockReset();
  process.env.JWT_SECRET = MOCK_SECRET;
});

import { middleware } from "../../middleware";
import { SESSION_COOKIE_NAME } from "../../../../packages/auth/src/lib/constants";
import type { SessionPayload } from "../../../../packages/auth/src/lib/payload";

// ─── Helpers ────────────────────────────────────────────────────

function createRequest(path: string, cookieValue?: string): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  const req = new NextRequest(url);
  if (cookieValue !== undefined) {
    req.cookies.set(SESSION_COOKIE_NAME, cookieValue);
  }
  return req;
}

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

// ─── Rotas públicas (não protegidas) ────────────────────────────

describe("middleware — rotas públicas", () => {
  it("permite acesso a /api/* sem verificação", async () => {
    const req = createRequest("/api/health");
    const res = await middleware(req);
    expect(res.status).not.toBe(307); // não redireciona
    expect(mockVerifySessionToken).not.toHaveBeenCalled();
  });

  it("permite acesso a /_next/* sem verificação", async () => {
    const req = createRequest("/_next/static/chunk.js");
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
    expect(mockVerifySessionToken).not.toHaveBeenCalled();
  });

  it("permite acesso a arquivos com extensão", async () => {
    const req = createRequest("/favicon.ico");
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
    expect(mockVerifySessionToken).not.toHaveBeenCalled();
  });

  it("permite acesso a /demo/auth (página de login)", async () => {
    const req = createRequest("/demo/auth");
    const res = await middleware(req);
    expect(res.status).not.toBe(307);
  });
});

// ─── Rotas protegidas — sem sessão ──────────────────────────────

describe("middleware — rotas protegidas sem cookie", () => {
  it("redireciona /demo/dashboard para login", async () => {
    const req = createRequest("/demo/dashboard");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("/demo/auth");
    expect(location).toContain("callbackUrl");
  });

  it("redireciona /demo/chamados para login", async () => {
    const req = createRequest("/demo/chamados");
    const res = await middleware(req);
    expect(res.status).toBe(307);
  });

  it("redireciona /demo/admin para login", async () => {
    const req = createRequest("/demo/admin");
    const res = await middleware(req);
    expect(res.status).toBe(307);
  });
});

// ─── Rotas protegidas — cookie inválido ─────────────────────────

describe("middleware — cookie adulterado/inválido", () => {
  it("redireciona quando cookie é JSON puro (antigo formato)", async () => {
    const jsonCookie = JSON.stringify(validSession);
    mockVerifySessionToken.mockResolvedValue(null);

    const req = createRequest("/demo/dashboard", jsonCookie);
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(mockVerifySessionToken).toHaveBeenCalledWith(jsonCookie, MOCK_SECRET);
  });

  it("redireciona quando assinatura HMAC é inválida", async () => {
    mockVerifySessionToken.mockResolvedValue(null);

    const req = createRequest("/demo/dashboard", "fake-token.fake-sig");
    const res = await middleware(req);

    expect(res.status).toBe(307);
  });

  it("redireciona quando token está expirado", async () => {
    mockVerifySessionToken.mockResolvedValue(null); // verifySessionToken already checks exp

    const req = createRequest("/demo/admin", "expired.token");
    const res = await middleware(req);

    expect(res.status).toBe(307);
  });
});

// ─── Rotas protegidas — sessão válida ───────────────────────────

describe("middleware — sessão válida", () => {
  it("permite acesso a /demo/dashboard com token válido", async () => {
    mockVerifySessionToken.mockResolvedValue(validSession);

    const req = createRequest("/demo/dashboard", "valid.token");
    const res = await middleware(req);

    expect(res.status).not.toBe(307);
    expect(mockVerifySessionToken).toHaveBeenCalledWith("valid.token", MOCK_SECRET);
  });

  it("permite acesso a /demo/admin com token válido", async () => {
    mockVerifySessionToken.mockResolvedValue(validSession);

    const req = createRequest("/demo/admin", "valid.token");
    const res = await middleware(req);

    expect(res.status).not.toBe(307);
  });

  it("permite acesso a /demo/chamados com token válido", async () => {
    mockVerifySessionToken.mockResolvedValue(validSession);

    const req = createRequest("/demo/chamados", "valid.token");
    const res = await middleware(req);

    expect(res.status).not.toBe(307);
  });
});

// ─── Verificação de tenantSlug no middleware ─────────────────────

describe("middleware — tenant slug mismatch", () => {
  it("redireciona quando tenantSlug do token difere do path", async () => {
    const mismatchSession: SessionPayload = {
      ...validSession,
      tenantSlug: "outra-empresa",
    };
    mockVerifySessionToken.mockResolvedValue(mismatchSession);

    const req = createRequest("/demo/dashboard", "valid.token");
    const res = await middleware(req);

    // Token é de "outra-empresa" mas path é /demo/...
    expect(res.status).toBe(307);
  });
});
