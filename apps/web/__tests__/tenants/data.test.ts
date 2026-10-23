import { describe, it, expect, beforeEach } from "vitest";

import {
  resetTenants,
  getAllTenants,
  getTenantBySlug,
  getTenantById,
  updateTenantTheme,
} from "../../lib/tenants/data";

beforeEach(() => {
  resetTenants();
});

// ─── getAllTenants ───────────────────────────────────────────────────

describe("getAllTenants", () => {
  it("retorna todos os tenants cadastrados", () => {
    const tenants = getAllTenants();
    expect(tenants.length).toBe(3);
  });

  it("cada tenant possui campos obrigatórios", () => {
    const tenants = getAllTenants();
    for (const t of tenants) {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(t.slug).toBeDefined();
      expect(t.subscription).toBeDefined();
      expect(t.theme).toBeDefined();
      expect(t.createdAt).toBeDefined();
    }
  });

  it("cada tenant possui um tema com todos os campos", () => {
    const tenants = getAllTenants();
    for (const t of tenants) {
      expect(t.theme.primaryColor).toBeDefined();
      expect(t.theme.borderRadius).toBeGreaterThanOrEqual(0);
      expect(t.theme.logoUrl).toBeDefined();
    }
  });
});

// ─── getTenantBySlug ────────────────────────────────────────────────

describe("getTenantBySlug", () => {
  it("encontra tenant pelo slug", () => {
    const tenant = getTenantBySlug("demo");
    expect(tenant).toBeDefined();
    expect(tenant!.slug).toBe("demo");
    expect(tenant!.name).toBe("Demo Corp");
  });

  it("retorna undefined para slug inexistente", () => {
    const tenant = getTenantBySlug("naoexiste");
    expect(tenant).toBeUndefined();
  });
});

// ─── getTenantById ──────────────────────────────────────────────────

describe("getTenantById", () => {
  it("encontra tenant pelo ID", () => {
    const tenant = getTenantById("t_01");
    expect(tenant).toBeDefined();
    expect(tenant!.id).toBe("t_01");
  });

  it("retorna undefined para ID inexistente", () => {
    const tenant = getTenantById("t_99");
    expect(tenant).toBeUndefined();
  });
});

// ─── updateTenantTheme ──────────────────────────────────────────────

describe("updateTenantTheme", () => {
  it("atualiza o tema de um tenant existente", () => {
    const result = updateTenantTheme("t_01", {
      companyName: "Nova Empresa",
      theme: {
        primaryColor: "#10b981",
        borderRadius: 16,
        logoUrl: "https://example.com/newlogo.png",
      },
    });

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Nova Empresa");
    expect(result!.theme.primaryColor).toBe("#10b981");
    expect(result!.theme.borderRadius).toBe(16);
    expect(result!.theme.logoUrl).toBe("https://example.com/newlogo.png");
  });

  it("persiste a atualização no store", () => {
    updateTenantTheme("t_01", {
      companyName: "Atualizada",
      theme: {
        primaryColor: "#000000",
        borderRadius: 0,
        logoUrl: "https://example.com/logo.png",
      },
    });

    const tenant = getTenantById("t_01");
    expect(tenant!.name).toBe("Atualizada");
    expect(tenant!.theme.primaryColor).toBe("#000000");
  });

  it("retorna null para tenant inexistente", () => {
    const result = updateTenantTheme("t_99", {
      companyName: "Fantasma",
      theme: {
        primaryColor: "#ffffff",
        borderRadius: 4,
        logoUrl: "https://example.com/logo.png",
      },
    });

    expect(result).toBeNull();
  });

  it("não altera outros tenants ao atualizar um", () => {
    const beforeT02 = getTenantById("t_02");
    const originalName = beforeT02!.name;

    updateTenantTheme("t_01", {
      companyName: "Só Eu Mudei",
      theme: {
        primaryColor: "#123456",
        borderRadius: 10,
        logoUrl: "https://example.com/logo.png",
      },
    });

    const afterT02 = getTenantById("t_02");
    expect(afterT02!.name).toBe(originalName);
  });
});
