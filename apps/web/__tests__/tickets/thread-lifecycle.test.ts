import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

import {
  getTicketById,
  assignTicket,
  disconnectTicket,
  submitTicketFeedback,
  checkAutoClose,
  createRelatedTicket,
} from "../../lib/tickets/data";

// ─── Fixtures ────────────────────────────────────────────────────────

const IN_PROGRESS_TICKET = {
  id: "tkt_002",
  code: "tkt_002",
  title: "Erro no relatório financeiro mensal",
  requester: "Carlos Santos",
  status: "in_progress",
  priority: "medium",
  category: "financeiro",
  description: "Os valores do relatório mensal estão divergindo do ERP.",
  createdAt: new Date("2024-11-02T14:30:00Z"),
  tenantId: "t_01",
  assignedTo: "u_01",
  disconnectedAt: null,
  feedbackDeadline: null,
  relatedTicketId: null,
  closedReason: null,
};

const OPEN_TICKET = {
  id: "tkt_001",
  code: "tkt_001",
  title: "Sistema de login não responde",
  requester: "Maria Oliveira",
  status: "open",
  priority: "high",
  category: "suporte_tecnico",
  description: "O sistema de login parou de funcionar após a atualização.",
  createdAt: new Date("2024-11-01T10:00:00Z"),
  tenantId: "t_01",
  assignedTo: null,
  disconnectedAt: null,
  feedbackDeadline: null,
  relatedTicketId: null,
  closedReason: null,
};

describe("Ciclo de vida da thread no ticket", () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  // ─── disconnectTicket ─────────────────────────────────────────

  describe("disconnectTicket", () => {
    it("muda status para pending_feedback quando ticket está in_progress", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(IN_PROGRESS_TICKET);
      prismaMock.ticket.update.mockImplementation(async ({ data }: any) => ({
        ...IN_PROGRESS_TICKET,
        ...data,
      }));

      const result = await disconnectTicket("tkt_002");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("pending_feedback");
      expect(result!.disconnectedAt).toBeDefined();
      expect(result!.feedbackDeadline).toBeDefined();
    });

    it("define feedbackDeadline como 24h após disconnectedAt", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(IN_PROGRESS_TICKET);
      prismaMock.ticket.update.mockImplementation(async ({ data }: any) => ({
        ...IN_PROGRESS_TICKET,
        ...data,
      }));

      const result = await disconnectTicket("tkt_002");
      expect(result).not.toBeNull();

      const disconnected = new Date(result!.disconnectedAt!).getTime();
      const deadline = new Date(result!.feedbackDeadline!).getTime();
      const diffHours = (deadline - disconnected) / (1000 * 60 * 60);

      expect(diffHours).toBe(24);
    });

    it("retorna null para ticket que não existe", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const result = await disconnectTicket("tkt_999");
      expect(result).toBeNull();
    });

    it("retorna null para ticket que não está in_progress", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(OPEN_TICKET);

      const result = await disconnectTicket("tkt_001");
      expect(result).toBeNull();
    });
  });

  // ─── submitTicketFeedback ─────────────────────────────────────

  describe("submitTicketFeedback", () => {
    const PENDING_TICKET = {
      ...IN_PROGRESS_TICKET,
      status: "pending_feedback",
      disconnectedAt: new Date().toISOString(),
      feedbackDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    it("marca ticket como resolved quando feedback é 'resolved'", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(PENDING_TICKET);
      prismaMock.ticket.update.mockImplementation(async ({ data }: any) => ({
        ...PENDING_TICKET,
        ...data,
      }));

      const result = await submitTicketFeedback("tkt_002", "resolved");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("resolved");
      expect(result!.closedReason).toBe("client_confirmed");
    });

    it("marca ticket como closed quando feedback é 'unresolved'", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(PENDING_TICKET);
      prismaMock.ticket.update.mockImplementation(async ({ data }: any) => ({
        ...PENDING_TICKET,
        ...data,
      }));

      const result = await submitTicketFeedback("tkt_002", "unresolved");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("closed");
      expect(result!.closedReason).toBe("client_unresolved");
    });

    it("retorna null para ticket que não está em pending_feedback", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(OPEN_TICKET);

      const result = await submitTicketFeedback("tkt_001", "resolved");
      expect(result).toBeNull();
    });

    it("retorna null para ticket inexistente", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const result = await submitTicketFeedback("tkt_999", "resolved");
      expect(result).toBeNull();
    });
  });

  // ─── checkAutoClose ───────────────────────────────────────────

  describe("checkAutoClose", () => {
    it("fecha automaticamente ticket com deadline expirado", async () => {
      const expiredTicket = {
        ...IN_PROGRESS_TICKET,
        status: "pending_feedback",
        disconnectedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        feedbackDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      };
      prismaMock.ticket.findUnique.mockResolvedValue(expiredTicket);
      prismaMock.ticket.update.mockImplementation(async ({ data }: any) => ({
        ...expiredTicket,
        ...data,
      }));

      const result = await checkAutoClose("tkt_002");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("resolved");
      expect(result!.closedReason).toBe("auto_closed");
    });

    it("não fecha ticket com deadline ainda válido", async () => {
      const pendingTicket = {
        ...IN_PROGRESS_TICKET,
        status: "pending_feedback",
        disconnectedAt: new Date().toISOString(),
        feedbackDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      prismaMock.ticket.findUnique.mockResolvedValue(pendingTicket);

      const result = await checkAutoClose("tkt_002");
      expect(result).toBeNull();
    });

    it("retorna null para ticket que não está em pending_feedback", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(OPEN_TICKET);

      const result = await checkAutoClose("tkt_001");
      expect(result).toBeNull();
    });

    it("retorna null para ticket inexistente", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const result = await checkAutoClose("tkt_999");
      expect(result).toBeNull();
    });
  });

  // ─── createRelatedTicket ──────────────────────────────────────

  describe("createRelatedTicket", () => {
    it("cria ticket relacionado com relatedTicketId apontando para o original", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(IN_PROGRESS_TICKET);
      prismaMock.ticket.count.mockResolvedValue(8);
      prismaMock.ticket.create.mockResolvedValue({
        id: "new_id",
        code: "tkt_009",
        title: "Problema persiste após atendimento",
        requester: "Carlos Santos",
        status: "open",
        priority: "medium",
        category: "financeiro",
        description: "O erro no relatório continua acontecendo.",
        tenantId: "t_01",
        assignedTo: null,
        disconnectedAt: null,
        feedbackDeadline: null,
        relatedTicketId: "tkt_002",
        closedReason: null,
        createdAt: new Date(),
      });

      const newTicket = await createRelatedTicket({
        originalTicketId: "tkt_002",
        title: "Problema persiste após atendimento",
        description: "O erro no relatório continua acontecendo.",
        requester: "Carlos Santos",
        category: "Financeiro",
        tenantId: "t_01",
      });

      expect(newTicket).not.toBeNull();
      expect(newTicket!.relatedTicketId).toBe("tkt_002");
      expect(newTicket!.status).toBe("open");
      expect(newTicket!.title).toBe("Problema persiste após atendimento");
    });

    it("retorna null se ticket original não existe", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const result = await createRelatedTicket({
        originalTicketId: "tkt_999",
        title: "Teste",
        description: "Teste",
        requester: "Teste",
        category: "TI",
        tenantId: "t_01",
      });

      expect(result).toBeNull();
    });

    it("novo ticket é independente e fica com status open", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(IN_PROGRESS_TICKET);
      prismaMock.ticket.count.mockResolvedValue(8);
      prismaMock.ticket.create.mockResolvedValue({
        id: "new_id",
        code: "tkt_009",
        title: "Novo ticket",
        requester: "Carlos Santos",
        status: "open",
        priority: "medium",
        category: "financeiro",
        description: "Descrição",
        tenantId: "t_01",
        assignedTo: null,
        disconnectedAt: null,
        feedbackDeadline: null,
        relatedTicketId: "tkt_002",
        closedReason: null,
        createdAt: new Date(),
      });

      const newTicket = await createRelatedTicket({
        originalTicketId: "tkt_002",
        title: "Novo ticket",
        description: "Descrição",
        requester: "Carlos Santos",
        category: "Financeiro",
        tenantId: "t_01",
      });

      expect(newTicket!.assignedTo).toBeNull();
      expect(newTicket!.status).toBe("open");
    });
  });
});
