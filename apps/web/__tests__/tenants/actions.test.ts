import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

import { updateThemeAction, type ThemeActionState } from "../../lib/tenants/actions";

const initialState: ThemeActionState = {
  success: false,
  error: null,
  fieldErrors: {},
};

function createFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

beforeEach(() => {
  resetPrismaMocks();
});

describe("updateThemeAction", () => {
  const validData = {
    tenantId: "t_01",
    companyName: "Empresa Atualizada",
    primaryColor: "#10b981",
    borderRadius: "12",
    logoUrl: "https://example.com/newlogo.png",
  };

  it("atualiza tema com dados válidos", async () => {
    prismaMock.tenant.update.mockResolvedValue({
      id: "t_01",
      name: "Empresa Atualizada",
      slug: "demo",
      subscription: "active",
      theme: {
        primaryColor: "#10b981",
        borderRadius: 12,
        logoUrl: "https://example.com/newlogo.png",
      },
      createdAt: new Date(),
    });

    const fd = createFormData(validData);
    const result = await updateThemeAction(initialState, fd);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.fieldErrors).toEqual({});
  });

  it("persiste as alterações via Prisma após sucesso", async () => {
    prismaMock.tenant.update.mockResolvedValue({
      id: "t_01",
      name: "Empresa Atualizada",
      slug: "demo",
      subscription: "active",
      theme: {
        primaryColor: "#10b981",
        borderRadius: 12,
        logoUrl: "https://example.com/newlogo.png",
      },
      createdAt: new Date(),
    });

    const fd = createFormData(validData);
    await updateThemeAction(initialState, fd);

    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: "t_01" },
      data: {
        name: "Empresa Atualizada",
        theme: {
          primaryColor: "#10b981",
          borderRadius: 12,
          logoUrl: "https://example.com/newlogo.png",
        },
      },
    });
  });

  it("retorna erro para cor inválida", async () => {
    const fd = createFormData({
      ...validData,
      primaryColor: "vermelho",
    });
    const result = await updateThemeAction(initialState, fd);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.fieldErrors.primaryColor).toBeDefined();
  });

  it("retorna erro para nome da empresa muito curto", async () => {
    const fd = createFormData({
      ...validData,
      companyName: "A",
    });
    const result = await updateThemeAction(initialState, fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.companyName).toBeDefined();
  });

  it("retorna erro para borderRadius fora do range", async () => {
    const fd = createFormData({
      ...validData,
      borderRadius: "30",
    });
    const result = await updateThemeAction(initialState, fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.borderRadius).toBeDefined();
  });

  it("retorna erro para URL de logo inválida", async () => {
    const fd = createFormData({
      ...validData,
      logoUrl: "not-a-url",
    });
    const result = await updateThemeAction(initialState, fd);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.logoUrl).toBeDefined();
  });

  it("retorna erro para tenant inexistente", async () => {
    prismaMock.tenant.update.mockRejectedValue(
      new Error("Record to update not found.")
    );

    const fd = createFormData({
      ...validData,
      tenantId: "t_99",
    });
    const result = await updateThemeAction(initialState, fd);

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });
});
