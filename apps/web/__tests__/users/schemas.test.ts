import { describe, it, expect } from "vitest";

import { userRoleSchema, loginWithRoleSchema } from "../../lib/users/schemas";

// ─── userRoleSchema ─────────────────────────────────────────────────

describe("userRoleSchema", () => {
  it("aceita role 'client'", () => {
    const result = userRoleSchema.safeParse("client");
    expect(result.success).toBe(true);
  });

  it("aceita role 'admin'", () => {
    const result = userRoleSchema.safeParse("admin");
    expect(result.success).toBe(true);
  });

  it("rejeita role inválida", () => {
    const result = userRoleSchema.safeParse("superadmin");
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.flatten().formErrors[0];
      expect(msg).toContain("tipo de usuário");
    }
  });

  it("rejeita string vazia", () => {
    const result = userRoleSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

// ─── loginWithRoleSchema ────────────────────────────────────────────

describe("loginWithRoleSchema", () => {
  const validInput = {
    email: "user@empresa.com",
    password: "senhaSegura123",
    tenantSlug: "demo",
    role: "client" as const,
  };

  it("aceita input válido com role client", () => {
    const result = loginWithRoleSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("aceita input válido com role admin", () => {
    const result = loginWithRoleSchema.safeParse({
      ...validInput,
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("transforma e-mail para lowercase", () => {
    const result = loginWithRoleSchema.safeParse({
      ...validInput,
      email: "USER@Empresa.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@empresa.com");
    }
  });

  // ── E-mail ──

  it("rejeita e-mail inválido", () => {
    const result = loginWithRoleSchema.safeParse({
      ...validInput,
      email: "invalido",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  // ── Password ──

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = loginWithRoleSchema.safeParse({
      ...validInput,
      password: "curta",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pwErr = result.error.flatten().fieldErrors.password;
      expect(pwErr).toBeDefined();
      expect(pwErr![0]).toContain("8");
    }
  });

  // ── Tenant slug ──

  it("rejeita tenant slug com caracteres especiais", () => {
    const result = loginWithRoleSchema.safeParse({
      ...validInput,
      tenantSlug: "DEMO_Corp!",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita tenant slug com menos de 2 caracteres", () => {
    const result = loginWithRoleSchema.safeParse({
      ...validInput,
      tenantSlug: "a",
    });
    expect(result.success).toBe(false);
  });

  // ── Role ──

  it("rejeita role inválida", () => {
    const result = loginWithRoleSchema.safeParse({
      ...validInput,
      role: "manager",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const roleErr = result.error.flatten().fieldErrors.role;
      expect(roleErr).toBeDefined();
      expect(roleErr![0]).toContain("tipo de usuário");
    }
  });

  // ── Campos obrigatórios ──

  it("rejeita input sem e-mail", () => {
    const { email: _, ...without } = validInput;
    const result = loginWithRoleSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejeita input sem senha", () => {
    const { password: _, ...without } = validInput;
    const result = loginWithRoleSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejeita input sem role", () => {
    const { role: _, ...without } = validInput;
    const result = loginWithRoleSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejeita input sem tenantSlug", () => {
    const { tenantSlug: _, ...without } = validInput;
    const result = loginWithRoleSchema.safeParse(without);
    expect(result.success).toBe(false);
  });
});
