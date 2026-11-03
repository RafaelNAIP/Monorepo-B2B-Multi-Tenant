import { describe, it, expect, vi, beforeEach } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";
import { makeFormData } from "../helpers/form-data";

// Mock @empresa/db
vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

// Mock session — captura chamadas de setSessionCookie
const setSessionCookieMock = vi.fn();
vi.mock("../../../../packages/auth/src/lib/session", () => ({
  setSessionCookie: (...args: unknown[]) => setSessionCookieMock(...args),
}));

// Mock password — controla verifyPassword
const verifyPasswordMock = vi.fn();
vi.mock("../../../../packages/auth/src/lib/password", () => ({
  verifyPassword: (...args: unknown[]) => verifyPasswordMock(...args),
}));

// Import DEPOIS dos mocks
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

const USER = {
  id: "507f1f77bcf86cd799439022",
  name: "João Admin",
  email: "admin@demo.com",
  passwordHash: "$2b$12$fakehashvalue",
  role: "admin" as const,
  tenantId: TENANT.id,
  createdAt: new Date(),
};

const INITIAL_STATE = {
  success: false,
  error: undefined,
  fieldErrors: undefined,
  redirectTo: undefined,
};

beforeEach(() => {
  resetPrismaMocks();
  setSessionCookieMock.mockReset();
  verifyPasswordMock.mockReset();
});

describe("loginAction — verificação de senha", () => {
  it("retorna erro genérico quando a senha está incorreta", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(TENANT);
    prismaMock.user.findFirst.mockResolvedValue(USER);
    verifyPasswordMock.mockResolvedValue(false);

    const fd = makeFormData({
      email: "admin@demo.com",
      password: "senha-errada",
      tenantSlug: "demo",
      role: "admin",
    });

    const result = await loginAction(INITIAL_STATE, fd);

    expect(result.success).toBe(false);
    // Mensagem genérica para prevenir enumeração de usuários
    expect(result.error).toBe("E-mail ou senha incorretos");
    expect(setSessionCookieMock).not.toHaveBeenCalled();
  });

  it("cria sessão quando a senha está correta", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(TENANT);
    prismaMock.user.findFirst.mockResolvedValue(USER);
    verifyPasswordMock.mockResolvedValue(true);

    const fd = makeFormData({
      email: "admin@demo.com",
      password: "senha@123",
      tenantSlug: "demo",
      role: "admin",
    });

    const result = await loginAction(INITIAL_STATE, fd);

    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/demo/admin");
    expect(setSessionCookieMock).toHaveBeenCalledWith({
      sub: USER.id,
      email: USER.email,
      name: USER.name,
      tenantId: TENANT.id,
      tenantSlug: TENANT.slug,
      role: USER.role,
    });
  });

  it("chama verifyPassword com a senha do form e o hash do banco", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(TENANT);
    prismaMock.user.findFirst.mockResolvedValue(USER);
    verifyPasswordMock.mockResolvedValue(true);

    const fd = makeFormData({
      email: "admin@demo.com",
      password: "minha-senha-secreta",
      tenantSlug: "demo",
      role: "admin",
    });

    await loginAction(INITIAL_STATE, fd);

    expect(verifyPasswordMock).toHaveBeenCalledWith(
      "minha-senha-secreta",
      USER.passwordHash
    );
  });

  it("retorna erro genérico quando o usuário não existe (previne enumeração)", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(TENANT);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const fd = makeFormData({
      email: "naoexiste@demo.com",
      password: "qualquer-senha",
      tenantSlug: "demo",
      role: "client",
    });

    const result = await loginAction(INITIAL_STATE, fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe("E-mail ou senha incorretos");
    // Não deve nem tentar verificar senha
    expect(verifyPasswordMock).not.toHaveBeenCalled();
  });

  it("retorna erro genérico quando usuário legado não tem passwordHash", async () => {
    const legacyUser = { ...USER, passwordHash: undefined as unknown as string };
    prismaMock.tenant.findUnique.mockResolvedValue(TENANT);
    prismaMock.user.findFirst.mockResolvedValue(legacyUser);

    const fd = makeFormData({
      email: "admin@demo.com",
      password: "senha@123",
      tenantSlug: "demo",
      role: "admin",
    });

    const result = await loginAction(INITIAL_STATE, fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe("E-mail ou senha incorretos");
    expect(verifyPasswordMock).not.toHaveBeenCalled();
  });

  it("redireciona client para /dashboard", async () => {
    const clientUser = { ...USER, id: "507f1f77bcf86cd799439033", role: "client" as const };
    prismaMock.tenant.findUnique.mockResolvedValue(TENANT);
    prismaMock.user.findFirst.mockResolvedValue(clientUser);
    verifyPasswordMock.mockResolvedValue(true);

    const fd = makeFormData({
      email: "maria@demo.com",
      password: "senha@123",
      tenantSlug: "demo",
      role: "client",
    });

    const result = await loginAction(INITIAL_STATE, fd);

    expect(result.success).toBe(true);
    expect(result.redirectTo).toBe("/demo/dashboard");
  });

  it("retorna erro de validação quando senha tem menos de 8 caracteres", async () => {
    const fd = makeFormData({
      email: "admin@demo.com",
      password: "curta",
      tenantSlug: "demo",
      role: "admin",
    });

    const result = await loginAction(INITIAL_STATE, fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Dados inválidos");
    expect(result.fieldErrors?.password).toBeDefined();
  });
});
