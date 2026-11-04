import { prisma } from "@empresa/db";

import { ATTACHMENTS_INVALID, attachToTicket } from "@/lib/attachments/data";
import {
  PAGE_SIZE,
  clampPage,
  pageWindow,
  totalPagesFor,
} from "@/lib/shared/pagination";
import { notifyThread } from "@/lib/sse/channel-singleton";
import type { TicketCategory, TicketStatus } from "./constants";

// ─── Category mapping (Portuguese display → Prisma enum) ─────────

const CATEGORY_TO_ENUM: Record<string, string> = {
  "Suporte Técnico": "suporte_tecnico",
  "Financeiro": "financeiro",
  "TI": "ti",
  "RH": "rh",
  "Comercial": "comercial",
};

const CATEGORY_ENUMS = Object.values(CATEGORY_TO_ENUM);

function categoryToEnum(cat: string): string {
  return CATEGORY_TO_ENUM[cat] ?? cat;
}

// ─── Filters ──────────────────────────────────────────────────────

interface TicketFilters {
  status?: TicketStatus;
  search?: string;
}

/**
 * Monta o where de listagem. Busca em título e solicitante; com
 * `searchCategory`, também casa o termo com o valor do enum de categoria
 * (mesmo comportamento que a busca client-side do painel admin tinha).
 */
function buildTicketWhere(
  tenantId: string,
  filters?: TicketFilters & { searchCategory?: boolean }
) {
  const where: Record<string, unknown> = { tenantId };

  if (filters?.status) {
    where.status = filters.status;
  }

  const term = filters?.search?.trim().toLowerCase() ?? "";
  if (term !== "") {
    const or: Record<string, unknown>[] = [
      { title: { contains: term, mode: "insensitive" } },
      { requester: { contains: term, mode: "insensitive" } },
    ];

    if (filters?.searchCategory) {
      const categories = CATEGORY_ENUMS.filter((value) => value.includes(term));
      if (categories.length > 0) {
        or.push({ category: { in: categories } });
      }
    }

    where.OR = or;
  }

  return where;
}

// ─── Public API ───────────────────────────────────────────────────

const FEEDBACK_DEADLINE_HOURS = 24;

/**
 * Returns tickets for a tenant, optionally filtered by status and/or search.
 * Search is case-insensitive and matches against title and requester.
 */
export async function getTickets(tenantId: string, filters?: TicketFilters) {
  return prisma.ticket.findMany({ where: buildTicketWhere(tenantId, filters) });
}

export interface TicketPageOptions extends TicketFilters {
  page: number;
  searchCategory?: boolean;
}

/**
 * Página de chamados do tenant (paginação server-side).
 * Conta o total com os mesmos filtros, limita a página ao intervalo existente
 * e busca só os itens daquela página, ordenados do mais recente para o mais antigo.
 */
export async function getTicketsPage(
  tenantId: string,
  options: TicketPageOptions
) {
  const where = buildTicketWhere(tenantId, options);

  const total = await prisma.ticket.count({ where });
  const totalPages = totalPagesFor(total, PAGE_SIZE);
  const page = clampPage(options.page, totalPages);

  const items = await prisma.ticket.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...pageWindow(page, PAGE_SIZE),
  });

  return { items, total, page, totalPages };
}

/** Returns a ticket by ID, or null if not found. */
export async function getTicketById(id: string) {
  return prisma.ticket.findUnique({ where: { id } });
}

/**
 * Creates a new ticket with default status "open" and priority "medium".
 * Com attachmentKeys, cria o chamado e associa os anexos na mesma transação;
 * se algum anexo não puder ser associado, a transação é desfeita.
 */
export async function createTicket(input: {
  title: string;
  category: TicketCategory;
  description: string;
  tenantId: string;
  requester: string;
  attachmentKeys?: string[];
}) {
  const keys = input.attachmentKeys ?? [];

  // Usa $transaction para garantir atomicidade entre count → create (evita
  // códigos duplicados em requisições concorrentes) e entre create → attach.
  return prisma.$transaction(async (tx) => {
    const count = await tx.ticket.count();
    const code = `tkt_${String(count + 1).padStart(3, "0")}`;

    const data = {
      code,
      title: input.title,
      requester: input.requester,
      status: "open",
      priority: "medium",
      category: categoryToEnum(input.category),
      description: input.description,
      tenantId: input.tenantId,
    };

    const ticket = await tx.ticket.create({ data });

    if (keys.length > 0) {
      const attached = await attachToTicket(
        { keys, ticketId: ticket.id, tenantId: input.tenantId },
        tx
      );
      if (attached !== keys.length) throw new Error(ATTACHMENTS_INVALID);
    }

    return ticket;
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

  const closed = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "resolved", closedReason: "auto_closed" },
  });

  // Mudança disparada pelo tempo, não por uma action: quem já está
  // conectado à thread precisa ser avisado.
  notifyThread(ticketId, "ticket_updated");

  return closed;
}

