import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  tenantSlug: z.string().min(1, "Slug do tenant é obrigatório"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const tenantSlugSchema = z
  .string()
  .min(2, "Slug deve ter pelo menos 2 caracteres")
  .max(50, "Slug deve ter no máximo 50 caracteres")
  .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens");
