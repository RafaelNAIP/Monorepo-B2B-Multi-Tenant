export const TICKET_STATUS = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
} as const;

export type TicketStatus = keyof typeof TICKET_STATUS;

export const TICKET_PRIORITY = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
} as const;

export type TicketPriority = keyof typeof TICKET_PRIORITY;

export const TICKET_CATEGORIES = [
  "Suporte Técnico",
  "Financeiro",
  "TI",
  "RH",
  "Comercial",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
