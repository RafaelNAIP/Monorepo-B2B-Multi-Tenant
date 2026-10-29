import { describe, it, expect } from "vitest";

import { loginSchema } from "../../../../packages/auth/src/schemas/auth.schema";

const base = {
  email: "admin@demo.com",
  password: "senha123",
  tenantSlug: "demo",
};

describe("loginSchema — role", () => {
  it("usa 'client' quando o role não é enviado", () => {
    const result = loginSchema.parse({ ...base, role: undefined });
    expect(result.role).toBe("client");
  });

  it("aceita 'admin' e 'client'", () => {
    expect(loginSchema.parse({ ...base, role: "admin" }).role).toBe("admin");
    expect(loginSchema.parse({ ...base, role: "client" }).role).toBe("client");
  });

  it("rejeita role desconhecido com mensagem no campo role", () => {
    const result = loginSchema.safeParse({ ...base, role: "root" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.role).toEqual([
        "Tipo de acesso inválido",
      ]);
    }
  });

  it("continua validando os demais campos", () => {
    const result = loginSchema.safeParse({ ...base, email: "invalido" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toEqual([
        "E-mail inválido",
      ]);
    }
  });
});
