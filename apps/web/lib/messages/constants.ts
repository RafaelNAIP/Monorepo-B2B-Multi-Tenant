// ─── Papéis de remetente ──────────────────────────────────────────

export const SENDER_ROLE = {
  admin: "Atendente",
  client: "Cliente",
} as const;

export type SenderRole = keyof typeof SENDER_ROLE;
