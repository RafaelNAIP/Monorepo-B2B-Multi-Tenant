import type { Message, ThreadAccess } from "./types";
import type { SenderRole } from "./constants";

// ─── In-memory stores ────────────────────────────────────────────

let messages: Message[] = [];
let threadAccesses: ThreadAccess[] = [];
let nextMessageId = 1;
let nextAccessId = 1;

/** Reseta os stores de mensagens e acessos (usado nos testes) */
export function resetMessages(): void {
  messages = [];
  threadAccesses = [];
  nextMessageId = 1;
  nextAccessId = 1;
}

// ─── Gerador de token simples ────────────────────────────────────
// Em produção, usar crypto.randomUUID() ou similar

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// ─── Messages API ────────────────────────────────────────────────

/** Cria uma nova mensagem na thread de um chamado */
export function createMessage(input: {
  ticketId: string;
  tenantId: string;
  senderRole: SenderRole;
  senderName: string;
  content: string;
}): Message {
  const message: Message = {
    id: `msg_${String(nextMessageId++).padStart(3, "0")}`,
    ticketId: input.ticketId,
    tenantId: input.tenantId,
    senderRole: input.senderRole,
    senderName: input.senderName,
    content: input.content,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  return message;
}

/** Retorna todas as mensagens de um ticket, ordenadas por data */
export function getMessagesByTicket(ticketId: string): Message[] {
  return messages
    .filter((m) => m.ticketId === ticketId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// ─── Thread Access API ───────────────────────────────────────────

/** Cria um token de acesso público para o cliente acessar a thread */
export function createThreadAccess(input: {
  ticketId: string;
  tenantId: string;
  clientName: string;
  clientEmail: string;
}): ThreadAccess {
  // Remove acesso anterior para o mesmo ticket (substitui)
  threadAccesses = threadAccesses.filter((a) => a.ticketId !== input.ticketId);

  const access: ThreadAccess = {
    id: `ta_${String(nextAccessId++).padStart(3, "0")}`,
    ticketId: input.ticketId,
    tenantId: input.tenantId,
    token: generateToken(),
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    createdAt: new Date().toISOString(),
  };

  threadAccesses.push(access);
  return access;
}

/** Busca um acesso de thread pelo token público */
export function getThreadAccessByToken(token: string): ThreadAccess | undefined {
  return threadAccesses.find((a) => a.token === token);
}

/** Busca um acesso de thread pelo ticketId */
export function getThreadAccessByTicket(ticketId: string): ThreadAccess | undefined {
  return threadAccesses.find((a) => a.ticketId === ticketId);
}
