"use server";

import { requireSession } from "@empresa/auth";
import {
  validationErrorState,
  type ActionState,
} from "@/lib/shared/action-state";

import { tenantThemeSchema } from "./schemas";
import { updateTenantTheme } from "./data";

export async function updateThemeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await requireSession({ role: "admin" });
  if (!result.ok) return result.errorState;
  const { session } = result;

  const raw = {
    companyName: formData.get("companyName") as string,
    primaryColor: formData.get("primaryColor") as string,
    borderRadius: Number(formData.get("borderRadius")),
    logoUrl: formData.get("logoUrl") as string,
  };

  const parsed = tenantThemeSchema.safeParse(raw);

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  // tenantId vem da sessão, nunca do FormData
  const updated = await updateTenantTheme(session.tenantId, {
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
