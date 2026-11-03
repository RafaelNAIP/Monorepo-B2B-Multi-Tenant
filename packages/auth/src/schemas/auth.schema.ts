import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("E-mail inválido")
    .max(255, "E-mail muito longo")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Senha deve ter ao menos 8 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres"),
  tenantSlug: z.string().min(1, "Slug do tenant é obrigatório"),
  role: z
    .enum(["admin", "client"], {
      errorMap: () => ({ message: "Tipo de acesso inválido" }),
    })
    .default("client"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const tenantSlugSchema = z
  .string()
  .min(2, "Slug deve ter pelo menos 2 caracteres")
  .max(50, "Slug deve ter no máximo 50 caracteres")
  .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens");
