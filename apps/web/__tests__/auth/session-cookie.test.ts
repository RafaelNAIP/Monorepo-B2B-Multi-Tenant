import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock do cookies() do Next.js ──────────────────────────────────
const cookieStore = new Map<string, string>();
const mockCookies = {
  get: (name: string) => {
    const value = cookieStore.get(name);
    return value !== undefined ? { name, value } : undefined;
  },
  set: vi.fn(
    (name: string, value: string, _opts?: Record<string, unknown>) => {
      cookieStore.set(name, value);
    }
  ),
  delete: vi.fn((name: string) => {
    cookieStore.delete(name);
  }),
};

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookies),
}));

// ─── Mock do env para JWT_SECRET ────────────────────────────────────
const MOCK_SECRET = "test-secret-key-for-session-at-least-32-chars!!";

beforeEach(() => {
  cookieStore.clear();
  mockCookies.set.mockClear();
  mockCookies.delete.mockClear();
  process.env.JWT_SECRET = MOCK_SECRET;
});

// Importar DEPOIS dos mocks
import {
  setSessionCookie,
  getSession,
  destroySession,
} from "../../../../packages/auth/src/lib/session";
import type { SessionPayload } from "../../../../packages/auth/src/lib/payload";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "../../../../packages/auth/src/lib/constants";

describe("setSessionCookie", () => {
  const payload: Omit<SessionPayload, "iat" | "exp"> = {
    sub: "507f1f77bcf86cd799439011",
    email: "admin@demo.com",
    name: "João Admin",
    tenantId: "507f1f77bcf86cd799439012",
    tenantSlug: "demo",
    role: "admin",
  };

  it("grava cookie com token assinado (não JSON puro)", async () => {
    await setSessionCookie(payload);
    expect(mockCookies.set).toHaveBeenCalledOnce();

    const [name, value, opts] = mockCookies.set.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE_NAME);

    // Token tem formato base64url.base64url (não JSON)
    expect(value.split(".")).toHaveLength(2);
    expect(value).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    // Não é JSON legível
    expect(() => JSON.parse(value)).toThrow();
  });

  it("configura atributos corretos do cookie", async () => {
    await setSessionCookie(payload);
    const opts = mockCookies.set.mock.calls[0][2];

    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  });

  it("cookie gerado pode ser lido de volta por getSession", async () => {
    await setSessionCookie(payload);
    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session!.sub).toBe(payload.sub);
    expect(session!.email).toBe(payload.email);
    expect(session!.name).toBe(payload.name);
    expect(session!.tenantId).toBe(payload.tenantId);
    expect(session!.tenantSlug).toBe(payload.tenantSlug);
    expect(session!.role).toBe(payload.role);
    // iat e exp são preenchidos automaticamente
    expect(typeof session!.iat).toBe("number");
    expect(typeof session!.exp).toBe("number");
    expect(session!.exp).toBe(session!.iat + SESSION_MAX_AGE);
  });
});

describe("getSession", () => {
  it("retorna null para cookie ausente", async () => {
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("retorna null para cookie JSON antigo (sem assinatura — retrocompatibilidade)", async () => {
    // Simula cookie antigo formato JSON puro
    const oldCookie = JSON.stringify({
      sub: "507f1f77bcf86cd799439011",
      email: "admin@demo.com",
      name: "João Admin",
      tenantId: "507f1f77bcf86cd799439012",
      tenantSlug: "demo",
      role: "admin",
    });
    cookieStore.set(SESSION_COOKIE_NAME, oldCookie);

    const session = await getSession();
    expect(session).toBeNull();
  });

  it("retorna null para cookie adulterado", async () => {
    // Cria cookie válido e depois adultera
    const payload: Omit<SessionPayload, "iat" | "exp"> = {
      sub: "507f1f77bcf86cd799439011",
      email: "admin@demo.com",
      name: "João Admin",
      tenantId: "507f1f77bcf86cd799439012",
      tenantSlug: "demo",
      role: "admin",
    };
    await setSessionCookie(payload);

    // Adultera o valor do cookie
    const token = cookieStore.get(SESSION_COOKIE_NAME)!;
    const parts = token.split(".");
    const tamperedPayload =
      parts[0].substring(0, 5) +
      (parts[0][5] === "Z" ? "A" : "Z") +
      parts[0].substring(6);
    cookieStore.set(SESSION_COOKIE_NAME, `${tamperedPayload}.${parts[1]}`);

    const session = await getSession();
    expect(session).toBeNull();
  });

  it("retorna null para cookie com valor vazio", async () => {
    cookieStore.set(SESSION_COOKIE_NAME, "");
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("retorna null para cookie lixo", async () => {
    cookieStore.set(SESSION_COOKIE_NAME, "not-a-valid-token-at-all");
    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe("destroySession", () => {
  it("remove o cookie de sessão", async () => {
    const payload: Omit<SessionPayload, "iat" | "exp"> = {
      sub: "507f1f77bcf86cd799439011",
      email: "admin@demo.com",
      name: "João Admin",
      tenantId: "507f1f77bcf86cd799439012",
      tenantSlug: "demo",
      role: "admin",
    };
    await setSessionCookie(payload);
    await destroySession();
    expect(mockCookies.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });
});
