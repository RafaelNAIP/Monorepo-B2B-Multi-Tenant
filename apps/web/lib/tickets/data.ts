import type { Ticket, ClosedReason } from "./types";
import type { TicketCategory, TicketStatus } from "./constants";

// ─── Seed data ────────────────────────────────────────────────────

const SEED_TICKETS: Ticket[] = [
  {
    id: "tkt_001",
    title: "Sistema de login não responde",
    requester: "Maria Oliveira",
    status: "open",
    priority: "high",
    category: "Suporte Técnico",
    description: "O sistema de login parou de funcionar após a atualização.",
    createdAt: "2024-11-01T10:00:00Z",
    tenantId: "t_01",
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
  {
    id: "tkt_002",
    title: "Erro no relatório financeiro mensal",
    requester: "Carlos Santos",
    status: "in_progress",
    priority: "medium",
    category: "Financeiro",
    description: "Os valores do relatório mensal estão divergindo do ERP.",
    createdAt: "2024-11-02T14:30:00Z",
    tenantId: "t_01",
    assignedTo: "u_01",
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
  {
    id: "tkt_003",
    title: "Solicitação de novo monitor",
    requester: "Ana Costa",
    status: "open",
    priority: "low",
    category: "TI",
    description: "Preciso de um monitor extra para trabalho com planilhas.",
    createdAt: "2024-11-03T09:15:00Z",
    tenantId: "t_01",
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
  {
    id: "tkt_004",
    title: "Atualização de dados cadastrais",
    requester: "Pedro Lima",
    status: "resolved",
    priority: "low",
    category: "RH",
    description: "Preciso atualizar meu endereço e telefone no sistema.",
    createdAt: "2024-11-04T11:00:00Z",
    tenantId: "t_01",
    assignedTo: "u_01",
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
  {
    id: "tkt_005",
    title: "Proposta comercial para cliente Acme",
    requester: "Fernanda Rocha",
    status: "in_progress",
    priority: "high",
    category: "Comercial",
    description: "Elaborar proposta para o cliente Acme Corp com desconto.",
    createdAt: "2024-11-05T16:45:00Z",
    tenantId: "t_01",
    assignedTo: "u_01",
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
  {
    id: "tkt_006",
    title: "VPN corporativa instável",
    requester: "João Almeida",
    status: "open",
    priority: "high",
    category: "Suporte Técnico",
    description: "A VPN desconecta frequentemente durante reuniões online.",
    createdAt: "2024-11-06T08:30:00Z",
    tenantId: "t_01",
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
  {
    id: "tkt_007",
    title: "Reembolso de viagem pendente",
    requester: "Lucas Ferreira",
    status: "open",
    priority: "medium",
    category: "Financeiro",
    description: "Reembolso da viagem a São Paulo ainda não foi processado.",
    createdAt: "2024-11-07T13:20:00Z",
    tenantId: "t_01",
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
  {
    id: "tkt_008",
    title: "Acesso ao sistema de outro tenant",
    requester: "Admin Tenant2",
    status: "open",
    priority: "medium",
    category: "TI",
    description: "Preciso de acesso ao painel de administração do sistema.",
    createdAt: "2024-11-08T10:00:00Z",
    tenantId: "t_02",
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
];

// ─── In-memory store (globalThis para sobreviver hot-reload) ─────

interface TicketStore {
  tickets: Ticket[];
  nextId: number;
}

const globalStore = globalThis as unknown as { __ticketStore?: TicketStore };

if (!globalStore.__ticketStore) {
  globalStore.__ticketStore = {
    tickets: structuredClone(SEED_TICKETS),
    nextId: 9,
  };
}

const store = globalStore.__ticketStore;

/** Resets the store to initial seed data (used in tests) */
export function resetTickets(): void {
  store.tickets = structuredClone(SEED_TICKETS);
  store.nextId = 9;
}

// ─── Filters ──────────────────────────────────────────────────────

interface TicketFilters {
  status?: TicketStatus;
  search?: string;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Returns tickets for a tenant, optionally filtered by status and/or search.
 * Search is case-insensitive and matches against title and requester.
 */
export function getTickets(tenantId: string, filters?: TicketFilters): Ticket[] {
  let result = store.tickets.filter((t) => t.tenantId === tenantId);

  if (filters?.status) {
    result = result.filter((t) => t.status === filters.status);
  }

  if (filters?.search && filters.search.trim() !== "") {
    const term = filters.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.requester.toLowerCase().includes(term)
    );
  }

  return result;
}

/** Returns a ticket by ID, or undefined if not found. */
export function getTicketById(id: string): Ticket | undefined {
  return store.tickets.find((t) => t.id === id);
}

/** Creates a new ticket with default status "open" and priority "medium". */
export function createTicket(input: {
  title: string;
  category: TicketCategory;
  description: string;
  tenantId: string;
  requester: string;
}): Ticket {
  const ticket: Ticket = {
    id: `tkt_${String(store.nextId++).padStart(3, "0")}`,
    title: input.title,
    requester: input.requester,
    status: "open",
    priority: "medium",
    category: input.category,
    description: input.description,
    createdAt: new Date().toISOString(),
    tenantId: input.tenantId,
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  };

  store.tickets.push(ticket);
  return ticket;
}

/**
 * Assigns a ticket to an admin user.
 * Only open tickets can be assigned. Sets status to "in_progress".
 * Returns the updated ticket or null if not found / not assignable.
 */
export function assignTicket(
  ticketId: string,
  adminUserId: string
): Ticket | null {
  const ticket = store.tickets.find((t) => t.id === ticketId);

  if (!ticket) return null;
  if (ticket.status !== "open") return null;

  ticket.assignedTo = adminUserId;
  ticket.status = "in_progress";

  return ticket;
}

// ─── Thread Lifecycle ────────────────────────────────────────────

const FEEDBACK_DEADLINE_HOURS = 24;

/**
 * Admin desconecta/encerra a conversa.
 * Muda status para pending_feedback e define deadline de 24h.
 * Só funciona para tickets in_progress.
 */
export function disconnectTicket(ticketId: string): Ticket | null {
  const ticket = store.tickets.find((t) => t.id === ticketId);

  if (!ticket) return null;
  if (ticket.status !== "in_progress") return null;

  const now = new Date();
  const deadline = new Date(now.getTime() + FEEDBACK_DEADLINE_HOURS * 60 * 60 * 1000);

  ticket.status = "pending_feedback";
  ticket.disconnectedAt = now.toISOString();
  ticket.feedbackDeadline = deadline.toISOString();

  return ticket;
}

/**
 * Cliente envia feedback sobre a resolução do chamado.
 * - "resolved" → status resolved, closedReason client_confirmed
 * - "unresolved" → status closed, closedReason client_unresolved
 * Só funciona para tickets em pending_feedback.
 */
export function submitTicketFeedback(
  ticketId: string,
  resolution: "resolved" | "unresolved"
): Ticket | null {
  const ticket = store.tickets.find((t) => t.id === ticketId);

  if (!ticket) return null;
  if (ticket.status !== "pending_feedback") return null;

  if (resolution === "resolved") {
    ticket.status = "resolved";
    ticket.closedReason = "client_confirmed";
  } else {
    ticket.status = "closed";
    ticket.closedReason = "client_unresolved";
  }

  return ticket;
}

/**
 * Verifica se o deadline de feedback expirou (check-on-access).
 * Se sim, auto-fecha o ticket como resolved com closedReason auto_closed.
 * Retorna o ticket atualizado ou null se não precisava fechar.
 */
export function checkAutoClose(ticketId: string): Ticket | null {
  const ticket = store.tickets.find((t) => t.id === ticketId);

  if (!ticket) return null;
  if (ticket.status !== "pending_feedback") return null;
  if (!ticket.feedbackDeadline) return null;

  const now = new Date();
  const deadline = new Date(ticket.feedbackDeadline);

  if (now <= deadline) return null;

  ticket.status = "resolved";
  ticket.closedReason = "auto_closed";

  return ticket;
}

/**
 * Cria um novo ticket vinculado a um ticket original (quando cliente
 * informa que o problema não foi resolvido).
 * Retorna null se o ticket original não existir.
 */
export function createRelatedTicket(input: {
  originalTicketId: string;
  title: string;
  description: string;
  requester: string;
  category: TicketCategory;
  tenantId: string;
}): Ticket | null {
  const original = store.tickets.find((t) => t.id === input.originalTicketId);
  if (!original) return null;

  const ticket: Ticket = {
    id: `tkt_${String(store.nextId++).padStart(3, "0")}`,
    title: input.title,
    requester: input.requester,
    status: "open",
    priority: "medium",
    category: input.category as TicketCategory,
    description: input.description,
    createdAt: new Date().toISOString(),
    tenantId: input.tenantId,
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: input.originalTicketId,
    closedReason: null,
  };

  store.tickets.push(ticket);
  return ticket;
}
