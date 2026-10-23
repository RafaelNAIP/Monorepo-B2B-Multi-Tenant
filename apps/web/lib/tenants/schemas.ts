import { z } from "zod";

export const tenantThemeSchema = z.object({
  companyName: z
    .string()
    .min(2, "Nome da empresa deve ter ao menos 2 caracteres")
    .max(100, "Nome da empresa deve ter no máximo 100 caracteres")
    .trim(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve estar no formato hexadecimal (#RRGGBB)"),
  borderRadius: z
    .number()
    .min(0, "Curvatura mínima é 0px")
    .max(24, "Curvatura máxima é 24px"),
  logoUrl: z
    .string()
    .url("URL do logo inválida")
    .max(500, "URL deve ter no máximo 500 caracteres"),
});

export type TenantThemeInput = z.infer<typeof tenantThemeSchema>;
