import { prisma } from "@empresa/db";

import type { SenderRole } from "./constants";

// ─── Messages API ────────────────────────────────────────────────

/** Cria uma nova mensagem na thread de um chamado */
export async function createMessage(input: {
  ticketId: string;
  tenantId: string;
  senderRole: SenderRole;
  senderName: string;
  content: string;
}) {
  return prisma.message.create({
    data: {
      ticketId: input.ticketId,
      tenantId: input.tenantId,
      senderRole: input.senderRole,
      senderName: input.senderName,
      content: input.content,
    },
  });
}

/** Retorna todas as mensagens de um ticket, ordenadas por data */
export async function getMessagesByTicket(ticketId: string) {
  return prisma.message.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Thread Access API ───────────────────────────────────────────

/** Cria um token de acesso público para o cliente acessar a thread */
export async function createThreadAccess(input: {
  ticketId: string;
  tenantId: string;
  clientName: string;
  clientEmail: string;
}) {
  // Remove acesso anterior para o mesmo ticket (substitui)
  await prisma.threadAccess.deleteMany({
    where: { ticketId: input.ticketId },
  });

  return prisma.threadAccess.create({
    data: {
      ticketId: input.ticketId,
      tenantId: input.tenantId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      token: crypto.randomUUID(),
    },
  });
}

/** Busca um acesso de thread pelo token público */
export async function getThreadAccessByToken(token: string) {
  return prisma.threadAccess.findFirst({ where: { token } });
}

/** Busca um acesso de thread pelo ticketId */
export async function getThreadAccessByTicket(ticketId: string) {
  return prisma.threadAccess.findFirst({ where: { ticketId } });
}
