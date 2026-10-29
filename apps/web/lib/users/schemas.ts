import { z } from "zod";

export const userRoleSchema = z.enum(["client", "admin"], {
  errorMap: () => ({ message: "Selecione um tipo de usuário válido" }),
});

export const loginWithRoleSchema = z.object({
  email: z
    .string()
    .email("E-mail inválido")
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Senha deve ter ao menos 8 caracteres")
    .max(128),
  tenantSlug: z
    .string()
    .min(2, "Tenant slug deve ter ao menos 2 caracteres")
    .max(63, "Tenant slug deve ter no máximo 63 caracteres")
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      "Slug deve conter apenas letras minúsculas, números e hifens"
    ),
  role: userRoleSchema,
});
