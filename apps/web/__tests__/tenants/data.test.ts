import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

import {
  getAllTenants,
  getTenantBySlug,
  getTenantById,
  updateTenantTheme,
} from "../../lib/tenants/data";

// ─── Fixtures ────────────────────────────────────────────────────────

const MOCK_TENANTS = [
  {
    id: "t_01",
    name: "Demo Corp",
    slug: "demo",
    subscription: "active",
    theme: {
      primaryColor: "#2563eb",
      borderRadius: 8,
      logoUrl: "https://via.placeholder.com/150",
    },
    createdAt: new Date("2024-09-01T10:00:00Z"),
  },
  {
    id: "t_02",
    name: "Acme Inc",
    slug: "acme",
    subscription: "trial",
    theme: {
      primaryColor: "#dc2626",
      borderRadius: 12,
      logoUrl: "https://via.placeholder.com/150/dc2626",
    },
    createdAt: new Date("2024-09-15T14:00:00Z"),
  },
  {
    id: "t_03",
    name: "Empresa Teste",
    slug: "teste",
    subscription: "inactive",
    theme: {
      primaryColor: "#2563eb",
      borderRadius: 8,
      logoUrl: "https://via.placeholder.com/150",
    },
    createdAt: new Date("2024-10-01T08:00:00Z"),
  },
];

beforeEach(() => {
  resetPrismaMocks();
});

// ─── getAllTenants ───────────────────────────────────────────────────

describe("getAllTenants", () => {
  it("retorna todos os tenants cadastrados", async () => {
    prismaMock.tenant.findMany.mockResolvedValue(MOCK_TENANTS);

    const tenants = await getAllTenants();
    expect(tenants.length).toBe(3);
    expect(prismaMock.tenant.findMany).toHaveBeenCalledOnce();
  });

  it("cada tenant possui campos obrigatórios", async () => {
    prismaMock.tenant.findMany.mockResolvedValue(MOCK_TENANTS);

    const tenants = await getAllTenants();
    for (const t of tenants) {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(t.slug).toBeDefined();
      expect(t.subscription).toBeDefined();
      expect(t.theme).toBeDefined();
      expect(t.createdAt).toBeDefined();
    }
  });

  it("cada tenant possui um tema com todos os campos", async () => {
    prismaMock.tenant.findMany.mockResolvedValue(MOCK_TENANTS);

    const tenants = await getAllTenants();
    for (const t of tenants) {
      expect(t.theme.primaryColor).toBeDefined();
      expect(t.theme.borderRadius).toBeGreaterThanOrEqual(0);
      expect(t.theme.logoUrl).toBeDefined();
    }
  });
});

// ─── getTenantBySlug ────────────────────────────────────────────────

describe("getTenantBySlug", () => {
  it("encontra tenant pelo slug", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(MOCK_TENANTS[0]);

    const tenant = await getTenantBySlug("demo");
    expect(tenant).toBeDefined();
    expect(tenant!.slug).toBe("demo");
    expect(tenant!.name).toBe("Demo Corp");
    expect(prismaMock.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "demo" },
    });
  });

  it("retorna null para slug inexistente", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);

    const tenant = await getTenantBySlug("naoexiste");
    expect(tenant).toBeNull();
  });
});

// ─── getTenantById ──────────────────────────────────────────────────

describe("getTenantById", () => {
  it("encontra tenant pelo ID", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(MOCK_TENANTS[0]);

    const tenant = await getTenantById("t_01");
    expect(tenant).toBeDefined();
    expect(tenant!.id).toBe("t_01");
    expect(prismaMock.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: "t_01" },
    });
  });

  it("retorna null para ID inexistente", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);

    const tenant = await getTenantById("t_99");
    expect(tenant).toBeNull();
  });
});

// ─── updateTenantTheme ──────────────────────────────────────────────

describe("updateTenantTheme", () => {
  it("atualiza o tema de um tenant existente", async () => {
    const updated = {
      ...MOCK_TENANTS[0],
      name: "Nova Empresa",
      theme: {
        primaryColor: "#10b981",
        borderRadius: 16,
        logoUrl: "https://example.com/newlogo.png",
      },
    };
    prismaMock.tenant.update.mockResolvedValue(updated);

    const result = await updateTenantTheme("t_01", {
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
    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: "t_01" },
      data: {
        name: "Nova Empresa",
        theme: {
          primaryColor: "#10b981",
          borderRadius: 16,
          logoUrl: "https://example.com/newlogo.png",
        },
      },
    });
  });

  it("retorna null para tenant inexistente", async () => {
    prismaMock.tenant.update.mockRejectedValue(
      new Error("Record to update not found.")
    );

    const result = await updateTenantTheme("t_99", {
      companyName: "Fantasma",
      theme: {
        primaryColor: "#ffffff",
        borderRadius: 4,
        logoUrl: "https://example.com/logo.png",
      },
    });

    expect(result).toBeNull();
  });
});
