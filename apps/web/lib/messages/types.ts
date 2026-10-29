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
