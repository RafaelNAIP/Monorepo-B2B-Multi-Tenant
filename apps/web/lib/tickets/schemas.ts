import { z } from "zod";

import { attachmentKeysSchema } from "@/lib/attachments/schemas";

import { TICKET_CATEGORIES } from "./constants";

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
  attachmentKeys: attachmentKeysSchema.optional(),
});

export const ticketFilterSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  search: z.string().optional(),
});

export const assignTicketSchema = z.object({
  ticketId: z
    .string()
    .min(1, "ID do chamado é obrigatório"),
  adminUserId: z
    .string()
    .min(1, "ID do administrador é obrigatório"),
});
