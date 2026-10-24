// ─── Papéis de remetente ──────────────────────────────────────────

export const SENDER_ROLE = {
  admin: "Atendente",
  client: "Cliente",
} as const;

export type SenderRole = keyof typeof SENDER_ROLE;

// ─── Status da thread ────────────────────────────────────────────

export const THREAD_STATUS = {
  active: "Ativa",
  disconnected: "Encerrada",
} as const;

export type ThreadStatus = keyof typeof THREAD_STATUS;
