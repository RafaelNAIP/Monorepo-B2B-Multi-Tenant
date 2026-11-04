import { describe, it, expect, vi, beforeEach } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";
import { makeFormData } from "../helpers/form-data";
import { resetRateLimitStore } from "../../../../packages/auth/src/lib/rate-limit";

// IP da requisição corrente, controlado por cada teste
const requestHeaders = vi.hoisted(() => ({ forwardedFor: "203.0.113.7" }));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": requestHeaders.forwardedFor }),
}));

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

const setSessionCookieMock = vi.fn();
vi.mock("../../../../packages/auth/src/lib/session", () => ({
  setSessionCookie: (...args: unknown[]) => setSessionCookieMock(...args),
}));

const verifyPasswordMock = vi.fn();
vi.mock("../../../../packages/auth/src/lib/password", () => ({
  verifyPassword: (...args: unknown[]) => verifyPasswordMock(...args),
}));

const { loginAction } = await import(
  "../../../../packages/auth/src/actions/login.action"
);

const TENANT = {
  id: "507f1f77bcf86cd799439011",
  name: "Demo Corp",
  slug: "demo",
  subscription: "active",
  theme: { primaryColor: "#2563EB", borderRadius: 8, logoUrl: "" },
  createdAt: new Date(),
};

const INITIAL_STATE = {
  success: false,
  error: undefined,
  fieldErrors: undefined,
  redirectTo: undefined,
};

const wrongPasswordForm = () =>
  makeFormData({
    email: "admin@demo.com",
    password: "senha-errada",
    tenantSlug: "demo",
    role: "admin",
  });

beforeEach(() => {
  resetPrismaMocks();
  resetRateLimitStore();
  setSessionCookieMock.mockReset();
  verifyPasswordMock.mockReset();
  verifyPasswordMock.mockResolvedValue(false);
  prismaMock.tenant.findUnique.mockResolvedValue(TENANT);
  prismaMock.user.findFirst.mockResolvedValue(null);
  requestHeaders.forwardedFor = "203.0.113.7";
});

describe("loginAction — rate limit por IP (5/min)", () => {
  it("permite as 5 primeiras tentativas do mesmo IP", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await loginAction(INITIAL_STATE, wrongPasswordForm());
      expect(result.error).toBe("E-mail ou senha incorretos");
    }
  });

  it("bloqueia a 6ª tentativa do mesmo IP com mensagem em português", async () => {
    for (let i = 0; i < 5; i++) {
      await loginAction(INITIAL_STATE, wrongPasswordForm());
    }
    const result = await loginAction(INITIAL_STATE, wrongPasswordForm());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Muitas tentativas/);
  });

  it("não consulta o banco quando bloqueado (corta antes de validar)", async () => {
    for (let i = 0; i < 5; i++) {
      await loginAction(INITIAL_STATE, wrongPasswordForm());
    }
    prismaMock.tenant.findUnique.mockClear();

    await loginAction(INITIAL_STATE, wrongPasswordForm());

    expect(prismaMock.tenant.findUnique).not.toHaveBeenCalled();
  });

  it("usa o primeiro IP de x-forwarded-for como chave", async () => {
    requestHeaders.forwardedFor = "198.51.100.9, 10.0.0.1";
    for (let i = 0; i < 5; i++) {
      await loginAction(INITIAL_STATE, wrongPasswordForm());
    }
    const blocked = await loginAction(INITIAL_STATE, wrongPasswordForm());
    expect(blocked.error).toMatch(/Muitas tentativas/);

    // Mesmo IP de origem em outra cadeia de proxy continua bloqueado
    requestHeaders.forwardedFor = "198.51.100.9";
    const stillBlocked = await loginAction(INITIAL_STATE, wrongPasswordForm());
    expect(stillBlocked.error).toMatch(/Muitas tentativas/);
  });

  it("IPs diferentes têm orçamentos independentes", async () => {
    for (let i = 0; i < 5; i++) {
      await loginAction(INITIAL_STATE, wrongPasswordForm());
    }
    expect(
      (await loginAction(INITIAL_STATE, wrongPasswordForm())).error
    ).toMatch(/Muitas tentativas/);

    requestHeaders.forwardedFor = "192.0.2.50";
    const other = await loginAction(INITIAL_STATE, wrongPasswordForm());
    expect(other.error).toBe("E-mail ou senha incorretos");
  });

  it("login bem-sucedido dentro do limite continua criando sessão", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: "507f1f77bcf86cd799439022",
      name: "João Admin",
      email: "admin@demo.com",
      passwordHash: "$2b$12$fakehashvalue",
      role: "admin",
      tenantId: TENANT.id,
      createdAt: new Date(),
    });
    verifyPasswordMock.mockResolvedValue(true);

    const result = await loginAction(INITIAL_STATE, wrongPasswordForm());

    expect(result.success).toBe(true);
    expect(setSessionCookieMock).toHaveBeenCalledOnce();
  });
});
