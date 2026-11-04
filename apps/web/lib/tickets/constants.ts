export const TICKET_STATUS = {
  open: "Aberto",
  in_progress: "Em andamento",
  pending_feedback: "Aguardando feedback",
  resolved: "Resolvido",
  closed: "Fechado",
} as const;

export type TicketStatus = keyof typeof TICKET_STATUS;

export const TICKET_PRIORITY = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
} as const;

export type TicketPriority = keyof typeof TICKET_PRIORITY;

export const TICKET_CATEGORY = {
  suporte_tecnico: "Suporte Técnico",
  financeiro: "Financeiro",
  ti: "TI",
  rh: "RH",
  comercial: "Comercial",
} as const;

export type TicketCategory = keyof typeof TICKET_CATEGORY;

/** Tupla dos valores do enum para uso em z.enum() */
export const TICKET_CATEGORY_VALUES = Object.keys(TICKET_CATEGORY) as [
  TicketCategory,
  ...TicketCategory[],
];
