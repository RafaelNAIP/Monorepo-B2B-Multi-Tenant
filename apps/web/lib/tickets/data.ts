import type { Ticket } from "./types";
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
  },
];

// ─── In-memory store ──────────────────────────────────────────────

let tickets: Ticket[] = structuredClone(SEED_TICKETS);
let nextId = 9;

/** Resets the store to initial seed data (used in tests) */
export function resetTickets(): void {
  tickets = structuredClone(SEED_TICKETS);
  nextId = 9;
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
  let result = tickets.filter((t) => t.tenantId === tenantId);

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
  return tickets.find((t) => t.id === id);
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
    id: `tkt_${String(nextId++).padStart(3, "0")}`,
    title: input.title,
    requester: input.requester,
    status: "open",
    priority: "medium",
    category: input.category,
    description: input.description,
    createdAt: new Date().toISOString(),
    tenantId: input.tenantId,
    assignedTo: null,
  };

  tickets.push(ticket);
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
  const ticket = tickets.find((t) => t.id === ticketId);

  if (!ticket) return null;
  if (ticket.status !== "open") return null;

  ticket.assignedTo = adminUserId;
  ticket.status = "in_progress";

  return ticket;
}
