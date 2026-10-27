import { prisma } from "@empresa/db";

import type { TicketCategory, TicketStatus } from "./constants";

// ─── Category mapping (Portuguese display → Prisma enum) ─────────

const CATEGORY_TO_ENUM: Record<string, string> = {
  "Suporte Técnico": "suporte_tecnico",
  "Financeiro": "financeiro",
  "TI": "ti",
  "RH": "rh",
  "Comercial": "comercial",
};

function categoryToEnum(cat: string): string {
  return CATEGORY_TO_ENUM[cat] ?? cat;
}

// ─── Filters ──────────────────────────────────────────────────────

interface TicketFilters {
  status?: TicketStatus;
  search?: string;
}

// ─── Public API ───────────────────────────────────────────────────

const FEEDBACK_DEADLINE_HOURS = 24;

/**
 * Returns tickets for a tenant, optionally filtered by status and/or search.
 * Search is case-insensitive and matches against title and requester.
 */
export async function getTickets(tenantId: string, filters?: TicketFilters) {
  const where: Record<string, unknown> = { tenantId };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search && filters.search.trim() !== "") {
    const term = filters.search.toLowerCase();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { requester: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.ticket.findMany({ where });
}

/** Returns a ticket by ID, or null if not found. */
export async function getTicketById(id: string) {
  return prisma.ticket.findUnique({ where: { id } });
}

/** Creates a new ticket with default status "open" and priority "medium". */
export async function createTicket(input: {
  title: string;
  category: TicketCategory;
  description: string;
  tenantId: string;
  requester: string;
}) {
  const count = await prisma.ticket.count();
  const code = `tkt_${String(count + 1).padStart(3, "0")}`;

  return prisma.ticket.create({
    data: {
      code,
      title: input.title,
      requester: input.requester,
      status: "open",
      priority: "medium",
      category: categoryToEnum(input.category),
      description: input.description,
      tenantId: input.tenantId,
    },
  });
}

/**
 * Assigns a ticket to an admin user.
 * Only open tickets can be assigned. Sets status to "in_progress".
 * Returns the updated ticket or null if not found / not assignable.
 */
export async function assignTicket(
  ticketId: string,
  adminUserId: string
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) return null;
  if (ticket.status !== "open") return null;

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedTo: adminUserId,
      status: "in_progress",
    },
  });
}

// ─── Thread Lifecycle ────────────────────────────────────────────

/**
 * Admin desconecta/encerra a conversa.
 * Muda status para pending_feedback e define deadline de 24h.
 * Só funciona para tickets in_progress.
 */
export async function disconnectTicket(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) return null;
  if (ticket.status !== "in_progress") return null;

  const now = new Date();
  const deadline = new Date(now.getTime() + FEEDBACK_DEADLINE_HOURS * 60 * 60 * 1000);

  return prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: "pending_feedback",
      disconnectedAt: now.toISOString(),
      feedbackDeadline: deadline.toISOString(),
    },
  });
}

/**
 * Cliente envia feedback sobre a resolução do chamado.
 * - "resolved" → status resolved, closedReason client_confirmed
 * - "unresolved" → status closed, closedReason client_unresolved
 * Só funciona para tickets em pending_feedback.
 */
export async function submitTicketFeedback(
  ticketId: string,
  resolution: "resolved" | "unresolved"
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) return null;
  if (ticket.status !== "pending_feedback") return null;

  if (resolution === "resolved") {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "resolved", closedReason: "client_confirmed" },
    });
  } else {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "closed", closedReason: "client_unresolved" },
    });
  }
}

/**
 * Verifica se o deadline de feedback expirou (check-on-access).
 * Se sim, auto-fecha o ticket como resolved com closedReason auto_closed.
 * Retorna o ticket atualizado ou null se não precisava fechar.
 */
export async function checkAutoClose(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) return null;
  if (ticket.status !== "pending_feedback") return null;
  if (!ticket.feedbackDeadline) return null;

  const now = new Date();
  const deadline = new Date(ticket.feedbackDeadline);

  if (now <= deadline) return null;

  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "resolved", closedReason: "auto_closed" },
  });
}

/**
 * Cria um novo ticket vinculado a um ticket original (quando cliente
 * informa que o problema não foi resolvido).
 * Retorna null se o ticket original não existir.
 */
export async function createRelatedTicket(input: {
  originalTicketId: string;
  title: string;
  description: string;
  requester: string;
  category: string;
  tenantId: string;
}) {
  const original = await prisma.ticket.findUnique({
    where: { id: input.originalTicketId },
  });
  if (!original) return null;

  const count = await prisma.ticket.count();
  const code = `tkt_${String(count + 1).padStart(3, "0")}`;

  return prisma.ticket.create({
    data: {
      code,
      title: input.title,
      requester: input.requester,
      status: "open",
      priority: "medium",
      category: categoryToEnum(input.category),
      description: input.description,
      tenantId: input.tenantId,
      relatedTicketId: input.originalTicketId,
    },
  });
}
