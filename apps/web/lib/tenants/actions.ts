"use server";

import { tenantThemeSchema } from "./schemas";
import { updateTenantTheme } from "./data";

export interface ThemeActionState {
  success: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]>;
}

export async function updateThemeAction(
  _prevState: ThemeActionState,
  formData: FormData
): Promise<ThemeActionState> {
  const raw = {
    companyName: formData.get("companyName") as string,
    primaryColor: formData.get("primaryColor") as string,
    borderRadius: Number(formData.get("borderRadius")),
    logoUrl: formData.get("logoUrl") as string,
  };

  const parsed = tenantThemeSchema.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      success: false,
      error: "Verifique os campos e tente novamente.",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  const tenantId = formData.get("tenantId") as string;

  const updated = await updateTenantTheme(tenantId, {
    companyName: parsed.data.companyName,
    theme: {
      primaryColor: parsed.data.primaryColor,
      borderRadius: parsed.data.borderRadius,
      logoUrl: parsed.data.logoUrl,
    },
  });

  if (!updated) {
    return {
      success: false,
      error: "Tenant não encontrado.",
      fieldErrors: {},
    };
  }

  return {
    success: true,
    error: null,
    fieldErrors: {},
  };
}
