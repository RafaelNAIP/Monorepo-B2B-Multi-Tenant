import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

// Mock next/cache antes de importar as actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  sendMessageAction,
  createThreadAccessAction,
  submitFeedbackAction,
} from "../../lib/messages/actions";

// Helper para criar FormData
function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

const initialState = { success: false, error: null, fieldErrors: {} };

describe("Server Actions de mensagens", () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  // ─── sendMessageAction ─────────────────────────────────────────

  describe("sendMessageAction", () => {
    it("cria mensagem com dados válidos", async () => {
      prismaMock.message.create.mockResolvedValue({
        id: "msg_new",
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "João Admin",
        content: "Olá, como posso ajudar?",
        createdAt: new Date(),
      });

      const fd = makeFormData({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "João Admin",
        content: "Olá, como posso ajudar?",
      });

      const result = await sendMessageAction(initialState, fd);
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(prismaMock.message.create).toHaveBeenCalledOnce();
    });

    it("cria mensagem como cliente", async () => {
      prismaMock.message.create.mockResolvedValue({
        id: "msg_new",
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "client",
        senderName: "Maria Cliente",
        content: "Preciso de ajuda com o sistema",
        createdAt: new Date(),
      });

      const fd = makeFormData({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "client",
        senderName: "Maria Cliente",
        content: "Preciso de ajuda com o sistema",
      });

      const result = await sendMessageAction(initialState, fd);
      expect(result.success).toBe(true);
    });

    it("retorna fieldErrors com conteúdo vazio", async () => {
      const fd = makeFormData({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "",
      });

      const result = await sendMessageAction(initialState, fd);
      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors.content).toBeDefined();
    });

    it("retorna fieldErrors com ticketId inválido", async () => {
      const fd = makeFormData({
        ticketId: "invalido",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Mensagem válida",
      });

      const result = await sendMessageAction(initialState, fd);
      expect(result.success).toBe(false);
      expect(result.fieldErrors.ticketId).toBeDefined();
    });

    it("retorna fieldErrors com role inválido", async () => {
      const fd = makeFormData({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "manager",
        senderName: "Admin",
        content: "Mensagem válida",
      });

      const result = await sendMessageAction(initialState, fd);
      expect(result.success).toBe(false);
    });

    it("não chama prisma.message.create quando validação falha", async () => {
      const fd = makeFormData({
        ticketId: "invalido",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Mensagem válida",
      });

      await sendMessageAction(initialState, fd);
      expect(prismaMock.message.create).not.toHaveBeenCalled();
    });
  });

  // ─── createThreadAccessAction ──────────────────────────────────

  describe("createThreadAccessAction", () => {
    it("cria acesso de thread com dados válidos", async () => {
      prismaMock.threadAccess.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.threadAccess.create.mockResolvedValue({
        id: "ta_new",
        ticketId: "tkt_001",
        tenantId: "t_01",
        token: "generated-token-value-1234567890ab",
        clientName: "Maria Oliveira",
        clientEmail: "maria@exemplo.com",
        createdAt: new Date(),
      });

      const fd = makeFormData({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "Maria Oliveira",
        clientEmail: "maria@exemplo.com",
        tenantSlug: "demo",
      });

      const result = await createThreadAccessAction(initialState, fd);
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(result.threadToken).toBeDefined();
      expect(result.threadToken!.length).toBeGreaterThan(10);
    });

    it("retorna fieldErrors com email inválido", async () => {
      const fd = makeFormData({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "Maria",
        clientEmail: "email-invalido",
        tenantSlug: "demo",
      });

      const result = await createThreadAccessAction(initialState, fd);
      expect(result.success).toBe(false);
      expect(result.fieldErrors.clientEmail).toBeDefined();
    });

    it("retorna fieldErrors com nome muito curto", async () => {
      const fd = makeFormData({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "A",
        clientEmail: "maria@exemplo.com",
        tenantSlug: "demo",
      });

      const result = await createThreadAccessAction(initialState, fd);
      expect(result.success).toBe(false);
      expect(result.fieldErrors.clientName).toBeDefined();
    });
  });

  // ─── submitFeedbackAction ──────────────────────────────────────

  describe("submitFeedbackAction", () => {
    it("retorna fieldErrors com resolution inválido", async () => {
      const fd = makeFormData({
        ticketId: "tkt_001",
        resolution: "maybe",
      });

      const result = await submitFeedbackAction(initialState, fd);
      expect(result.success).toBe(false);
      expect(result.fieldErrors.resolution).toBeDefined();
    });

    it("retorna fieldErrors com ticketId inválido", async () => {
      const fd = makeFormData({
        ticketId: "invalido",
        resolution: "resolved",
      });

      const result = await submitFeedbackAction(initialState, fd);
      expect(result.success).toBe(false);
      expect(result.fieldErrors.ticketId).toBeDefined();
    });

    it("aceita feedback 'resolved' com dados válidos", async () => {
      const pendingTicket = {
        id: "tkt_001",
        code: "tkt_001",
        title: "Problema no sistema",
        requester: "Maria",
        status: "pending_feedback",
        priority: "high",
        category: "suporte_tecnico",
        description: "Desc",
        tenantId: "t_01",
        assignedTo: "u_01",
        disconnectedAt: new Date().toISOString(),
        feedbackDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        relatedTicketId: null,
        closedReason: null,
        createdAt: new Date(),
      };
      prismaMock.ticket.findUnique.mockResolvedValue(pendingTicket);
      prismaMock.ticket.update.mockResolvedValue({
        ...pendingTicket,
        status: "resolved",
        closedReason: "client_confirmed",
      });

      const fd = makeFormData({
        ticketId: "tkt_001",
        resolution: "resolved",
        tenantSlug: "demo",
      });

      const result = await submitFeedbackAction(initialState, fd);
      expect(result.success).toBe(true);
    });

    it("aceita feedback 'unresolved' com dados válidos", async () => {
      const pendingTicket = {
        id: "tkt_001",
        code: "tkt_001",
        title: "Problema no sistema",
        requester: "Maria",
        status: "pending_feedback",
        priority: "high",
        category: "suporte_tecnico",
        description: "Desc",
        tenantId: "t_01",
        assignedTo: "u_01",
        disconnectedAt: new Date().toISOString(),
        feedbackDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        relatedTicketId: null,
        closedReason: null,
        createdAt: new Date(),
      };
      prismaMock.ticket.findUnique.mockResolvedValue(pendingTicket);
      prismaMock.ticket.update.mockResolvedValue({
        ...pendingTicket,
        status: "closed",
        closedReason: "client_unresolved",
      });

      const fd = makeFormData({
        ticketId: "tkt_001",
        resolution: "unresolved",
        tenantSlug: "demo",
      });

      const result = await submitFeedbackAction(initialState, fd);
      expect(result.success).toBe(true);
    });

    it("retorna erro quando ticket não está em pending_feedback", async () => {
      // submitTicketFeedback retorna null para ticket que não está em pending_feedback
      prismaMock.ticket.findUnique.mockResolvedValue({
        id: "tkt_002",
        code: "tkt_002",
        title: "Outro chamado",
        requester: "Carlos",
        status: "open",
        priority: "medium",
        category: "financeiro",
        description: "Desc",
        tenantId: "t_01",
        assignedTo: null,
        disconnectedAt: null,
        feedbackDeadline: null,
        relatedTicketId: null,
        closedReason: null,
        createdAt: new Date(),
      });

      const fd = makeFormData({
        ticketId: "tkt_002",
        resolution: "resolved",
        tenantSlug: "demo",
      });

      const result = await submitFeedbackAction(initialState, fd);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Chamado não encontrado ou não está aguardando feedback.");
    });
  });
});
