import type { SenderRole } from "./constants";

// ─── Mensagem individual na thread ───────────────────────────────

export interface Message {
  id: string;
  ticketId: string;
  tenantId: string;
  senderRole: SenderRole;
  senderName: string;
  content: string;
  createdAt: string;
}

// ─── Token de acesso público para o cliente ──────────────────────

export interface ThreadAccess {
  id: string;
  ticketId: string;
  tenantId: string;
  token: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
}
