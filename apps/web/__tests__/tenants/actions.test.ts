import { describe, it, expect, beforeEach } from "vitest";

import { resetTenants, getTenantById } from "../../lib/tenants/data";

// Importação do action sem "use server" — vitest não suporta a diretiva
// O teste importa diretamente a função
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
  resetTenants();
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
    const fd = createFormData(validData);
    const result = await updateThemeAction(initialState, fd);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.fieldErrors).toEqual({});
  });

  it("persiste as alterações no store após sucesso", async () => {
    const fd = createFormData(validData);
    await updateThemeAction(initialState, fd);

    const tenant = getTenantById("t_01");
    expect(tenant!.name).toBe("Empresa Atualizada");
    expect(tenant!.theme.primaryColor).toBe("#10b981");
    expect(tenant!.theme.borderRadius).toBe(12);
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
    const fd = createFormData({
      ...validData,
      tenantId: "t_99",
    });
    const result = await updateThemeAction(initialState, fd);

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });
});
