import { z } from "zod";

// ─── createMessageSchema ─────────────────────────────────────────
// Valida uma nova mensagem na thread de um chamado

export const createMessageSchema = z.object({
  ticketId: z
    .string()
    .min(1, "ID do chamado é obrigatório"),
  tenantId: z
    .string()
    .min(1, "ID do tenant é obrigatório"),
  senderRole: z.enum(["admin", "client"], {
    errorMap: () => ({ message: "Papel do remetente inválido" }),
  }),
  senderName: z
    .string()
    .min(1, "Nome do remetente é obrigatório"),
  content: z
    .string()
    .min(1, "Mensagem não pode ser vazia")
    .max(5000, "Mensagem deve ter no máximo 5000 caracteres")
    .trim()
    .refine((val) => val.length > 0, {
      message: "Mensagem não pode ser vazia",
    }),
});

// ─── createThreadAccessSchema ────────────────────────────────────
// Valida criação de um token de acesso público para o cliente

export const createThreadAccessSchema = z.object({
  ticketId: z
    .string()
    .min(1, "ID do chamado é obrigatório"),
  tenantId: z
    .string()
    .min(1, "ID do tenant é obrigatório"),
  clientName: z
    .string()
    .min(2, "Nome do cliente deve ter ao menos 2 caracteres")
    .max(100, "Nome do cliente deve ter no máximo 100 caracteres")
    .trim(),
  clientEmail: z
    .string()
    .email("E-mail inválido"),
});

// ─── feedbackSchema ──────────────────────────────────────────────
// Valida o feedback do cliente sobre a resolução do chamado

export const feedbackSchema = z.object({
  ticketId: z
    .string()
    .min(1, "ID do chamado é obrigatório"),
  resolution: z.enum(["resolved", "unresolved"], {
    errorMap: () => ({ message: "Selecione se o chamado foi resolvido ou não" }),
  }),
});
