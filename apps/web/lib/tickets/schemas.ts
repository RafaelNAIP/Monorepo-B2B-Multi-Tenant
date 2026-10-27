import { z } from "zod";

import { TICKET_CATEGORIES } from "./constants";

const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "docx"] as const;

export const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, "Título deve ter ao menos 5 caracteres")
    .max(120, "Título deve ter no máximo 120 caracteres")
    .trim(),
  category: z.enum(TICKET_CATEGORIES, {
    errorMap: () => ({ message: "Selecione uma categoria" }),
  }),
  description: z
    .string()
    .min(10, "Descrição deve ter ao menos 10 caracteres")
    .max(2000, "Descrição deve ter no máximo 2000 caracteres")
    .trim(),
  attachment: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const ext = val.split(".").pop()?.toLowerCase();
        return ext
          ? (ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
          : false;
      },
      {
        message: `Formato de arquivo não suportado. Permitidos: ${ALLOWED_EXTENSIONS.join(", ")}`,
      }
    ),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketFilterSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  search: z.string().optional(),
});

export type TicketFilter = z.infer<typeof ticketFilterSchema>;

export const assignTicketSchema = z.object({
  ticketId: z
    .string()
    .min(1, "ID do chamado é obrigatório"),
  adminUserId: z
    .string()
    .min(1, "ID do administrador é obrigatório"),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
