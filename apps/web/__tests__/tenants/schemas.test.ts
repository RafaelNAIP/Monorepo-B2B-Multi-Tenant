import { describe, it, expect } from "vitest";

import { tenantThemeSchema } from "../../lib/tenants/schemas";

describe("tenantThemeSchema", () => {
  const validInput = {
    companyName: "Minha Empresa",
    primaryColor: "#2563eb",
    borderRadius: 8,
    logoUrl: "https://example.com/logo.png",
  };

  it("aceita input válido completo", () => {
    const result = tenantThemeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  // ── companyName ──

  it("rejeita nome da empresa com menos de 2 caracteres", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      companyName: "A",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.flatten().fieldErrors.companyName;
      expect(err).toBeDefined();
      expect(err![0]).toContain("2");
    }
  });

  it("rejeita nome da empresa com mais de 100 caracteres", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      companyName: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("faz trim no nome da empresa", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      companyName: "  Empresa Teste  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe("Empresa Teste");
    }
  });

  // ── primaryColor ──

  it("aceita cor hexadecimal válida", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      primaryColor: "#ff5733",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita cor sem #", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      primaryColor: "ff5733",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.flatten().fieldErrors.primaryColor;
      expect(err).toBeDefined();
      expect(err![0]).toContain("hexadecimal");
    }
  });

  it("rejeita cor com formato inválido (#FFF)", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      primaryColor: "#FFF",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita cor com caracteres inválidos", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      primaryColor: "#GGGGGG",
    });
    expect(result.success).toBe(false);
  });

  // ── borderRadius ──

  it("aceita borderRadius 0", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      borderRadius: 0,
    });
    expect(result.success).toBe(true);
  });

  it("aceita borderRadius 24", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      borderRadius: 24,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita borderRadius negativo", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      borderRadius: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.flatten().fieldErrors.borderRadius;
      expect(err).toBeDefined();
      expect(err![0]).toContain("0");
    }
  });

  it("rejeita borderRadius maior que 24", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      borderRadius: 25,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.flatten().fieldErrors.borderRadius;
      expect(err).toBeDefined();
      expect(err![0]).toContain("24");
    }
  });

  // ── logoUrl ──

  it("aceita URL válida", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      logoUrl: "https://cdn.empresa.com/logos/acme.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita URL inválida", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      logoUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const err = result.error.flatten().fieldErrors.logoUrl;
      expect(err).toBeDefined();
      expect(err![0]).toContain("inválida");
    }
  });

  it("rejeita URL com mais de 500 caracteres", () => {
    const result = tenantThemeSchema.safeParse({
      ...validInput,
      logoUrl: "https://example.com/" + "a".repeat(490),
    });
    expect(result.success).toBe(false);
  });

  // ── Campos obrigatórios ──

  it("rejeita input sem companyName", () => {
    const { companyName: _, ...without } = validInput;
    const result = tenantThemeSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejeita input sem primaryColor", () => {
    const { primaryColor: _, ...without } = validInput;
    const result = tenantThemeSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejeita input sem borderRadius", () => {
    const { borderRadius: _, ...without } = validInput;
    const result = tenantThemeSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejeita input sem logoUrl", () => {
    const { logoUrl: _, ...without } = validInput;
    const result = tenantThemeSchema.safeParse(without);
    expect(result.success).toBe(false);
  });
});
