import { describe, it, expect, beforeEach } from "vitest";

import {
  resetTickets,
  getTicketById,
  assignTicket,
  disconnectTicket,
  submitTicketFeedback,
  checkAutoClose,
  createRelatedTicket,
} from "../../lib/tickets/data";

describe("Ciclo de vida da thread no ticket", () => {
  beforeEach(() => {
    resetTickets();
  });

  // ─── disconnectTicket ─────────────────────────────────────────

  describe("disconnectTicket", () => {
    it("muda status para pending_feedback quando ticket está in_progress", () => {
      // tkt_002 já é in_progress com assignedTo u_01
      const result = disconnectTicket("tkt_002");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("pending_feedback");
      expect(result!.disconnectedAt).toBeDefined();
      expect(result!.feedbackDeadline).toBeDefined();
    });

    it("define feedbackDeadline como 24h após disconnectedAt", () => {
      const result = disconnectTicket("tkt_002");
      expect(result).not.toBeNull();

      const disconnected = new Date(result!.disconnectedAt!).getTime();
      const deadline = new Date(result!.feedbackDeadline!).getTime();
      const diffHours = (deadline - disconnected) / (1000 * 60 * 60);

      expect(diffHours).toBe(24);
    });

    it("retorna null para ticket que não existe", () => {
      const result = disconnectTicket("tkt_999");
      expect(result).toBeNull();
    });

    it("retorna null para ticket que não está in_progress", () => {
      // tkt_001 está open
      const result = disconnectTicket("tkt_001");
      expect(result).toBeNull();
    });

    it("persiste as alterações no store", () => {
      disconnectTicket("tkt_002");
      const ticket = getTicketById("tkt_002");
      expect(ticket!.status).toBe("pending_feedback");
      expect(ticket!.disconnectedAt).toBeDefined();
    });
  });

  // ─── submitTicketFeedback ─────────────────────────────────────

  describe("submitTicketFeedback", () => {
    beforeEach(() => {
      // Precisa estar em pending_feedback para receber feedback
      disconnectTicket("tkt_002");
    });

    it("marca ticket como resolved quando feedback é 'resolved'", () => {
      const result = submitTicketFeedback("tkt_002", "resolved");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("resolved");
      expect(result!.closedReason).toBe("client_confirmed");
    });

    it("marca ticket como closed quando feedback é 'unresolved'", () => {
      const result = submitTicketFeedback("tkt_002", "unresolved");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("closed");
      expect(result!.closedReason).toBe("client_unresolved");
    });

    it("retorna null para ticket que não está em pending_feedback", () => {
      // tkt_001 está open
      const result = submitTicketFeedback("tkt_001", "resolved");
      expect(result).toBeNull();
    });

    it("retorna null para ticket inexistente", () => {
      const result = submitTicketFeedback("tkt_999", "resolved");
      expect(result).toBeNull();
    });
  });

  // ─── checkAutoClose ───────────────────────────────────────────

  describe("checkAutoClose", () => {
    it("fecha automaticamente ticket com deadline expirado", () => {
      // Simula disconnect com deadline no passado
      disconnectTicket("tkt_002");
      const ticket = getTicketById("tkt_002")!;

      // Força deadline para o passado (25h atrás)
      const pastDeadline = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      (ticket as any).feedbackDeadline = pastDeadline;

      const result = checkAutoClose("tkt_002");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("resolved");
      expect(result!.closedReason).toBe("auto_closed");
    });

    it("não fecha ticket com deadline ainda válido", () => {
      disconnectTicket("tkt_002");

      const result = checkAutoClose("tkt_002");
      // Deadline é 24h no futuro, não deve fechar
      expect(result).toBeNull();
    });

    it("retorna null para ticket que não está em pending_feedback", () => {
      const result = checkAutoClose("tkt_001");
      expect(result).toBeNull();
    });

    it("retorna null para ticket inexistente", () => {
      const result = checkAutoClose("tkt_999");
      expect(result).toBeNull();
    });
  });

  // ─── createRelatedTicket ──────────────────────────────────────

  describe("createRelatedTicket", () => {
    it("cria ticket relacionado com relatedTicketId apontando para o original", () => {
      const newTicket = createRelatedTicket({
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

    it("retorna null se ticket original não existe", () => {
      const result = createRelatedTicket({
        originalTicketId: "tkt_999",
        title: "Teste",
        description: "Teste",
        requester: "Teste",
        category: "TI",
        tenantId: "t_01",
      });

      expect(result).toBeNull();
    });

    it("novo ticket é independente e fica com status open", () => {
      const newTicket = createRelatedTicket({
        originalTicketId: "tkt_002",
        title: "Novo ticket",
        description: "Descrição",
        requester: "Carlos Santos",
        category: "Financeiro",
        tenantId: "t_01",
      });

      expect(newTicket!.assignedTo).toBeNull();
      expect(newTicket!.status).toBe("open");
      expect(newTicket!.id).toMatch(/^tkt_\d{3,}$/);
    });
  });
});
