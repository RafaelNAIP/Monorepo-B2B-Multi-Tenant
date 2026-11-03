import { describe, it, expect } from "vitest";

import { sessionPayloadSchema } from "../../../../packages/auth/src/lib/payload";

describe("sessionPayloadSchema", () => {
  const validPayload = {
    sub: "507f1f77bcf86cd799439011",
    email: "admin@demo.com",
    name: "João Admin",
    tenantId: "507f1f77bcf86cd799439012",
    tenantSlug: "demo",
    role: "admin" as const,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 2592000,
  };

  it("aceita payload completo e válido", () => {
    const result = sessionPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validPayload);
    }
  });

  it("aceita role 'client'", () => {
    const result = sessionPayloadSchema.safeParse({
      ...validPayload,
      role: "client",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita sub faltando", () => {
    const { sub: _, ...noSub } = validPayload;
    const result = sessionPayloadSchema.safeParse(noSub);
    expect(result.success).toBe(false);
  });

  it("rejeita email faltando", () => {
    const { email: _, ...noEmail } = validPayload;
    const result = sessionPayloadSchema.safeParse(noEmail);
    expect(result.success).toBe(false);
  });

  it("rejeita tenantId faltando", () => {
    const { tenantId: _, ...noTenant } = validPayload;
    const result = sessionPayloadSchema.safeParse(noTenant);
    expect(result.success).toBe(false);
  });

  it("rejeita role fora de admin | client", () => {
    const result = sessionPayloadSchema.safeParse({
      ...validPayload,
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita exp não numérico", () => {
    const result = sessionPayloadSchema.safeParse({
      ...validPayload,
      exp: "2026-12-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita iat não numérico", () => {
    const result = sessionPayloadSchema.safeParse({
      ...validPayload,
      iat: "agora",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita campos extras (strict)", () => {
    const result = sessionPayloadSchema.safeParse({
      ...validPayload,
      extraField: "hack",
    });
    expect(result.success).toBe(false);
  });
});
