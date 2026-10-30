import type { SenderRole } from "./constants";

// ─── Anexo de uma mensagem ───────────────────────────────────────

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
}

// ─── Mensagem individual na thread ───────────────────────────────

export interface Message {
  id: string;
  ticketId: string;
  tenantId: string;
  senderRole: SenderRole;
  senderName: string;
  content: string;
  createdAt: string;
  attachments?: MessageAttachment[];
}
