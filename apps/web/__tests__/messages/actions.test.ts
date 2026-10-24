import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock next/cache antes de importar as actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  sendMessageAction,
  createThreadAccessAction,
  submitFeedbackAction,
} from "../../lib/messages/actions";
import { resetMessages, getMessagesByTicket, getThreadAccessByTicket } from "../../lib/messages/data";
import { resetTickets, getTicketById } from "../../lib/tickets/data";

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
    resetMessages();
    resetTickets();
  });

  // ─── sendMessageAction ─────────────────────────────────────────

  describe("sendMessageAction", () => {
    it("cria mensagem com dados válidos", async () => {
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

      const msgs = getMessagesByTicket("tkt_001");
      expect(msgs).toHaveLength(1);
      expect(msgs[0]!.content).toBe("Olá, como posso ajudar?");
    });

    it("cria mensagem como cliente", async () => {
      const fd = makeFormData({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "client",
        senderName: "Maria Cliente",
        content: "Preciso de ajuda com o sistema",
      });

      const result = await sendMessageAction(initialState, fd);
      expect(result.success).toBe(true);

      const msgs = getMessagesByTicket("tkt_001");
      expect(msgs[0]!.senderRole).toBe("client");
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
  });

  // ─── createThreadAccessAction ──────────────────────────────────

  describe("createThreadAccessAction", () => {
    it("cria acesso de thread com dados válidos", async () => {
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

      const access = getThreadAccessByTicket("tkt_001");
      expect(access).toBeDefined();
      expect(access!.clientName).toBe("Maria Oliveira");
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
      const fd = makeFormData({
        ticketId: "tkt_001",
        resolution: "resolved",
        tenantSlug: "demo",
      });

      const result = await submitFeedbackAction(initialState, fd);
      expect(result.success).toBe(true);
    });

    it("aceita feedback 'unresolved' com dados válidos", async () => {
      const fd = makeFormData({
        ticketId: "tkt_001",
        resolution: "unresolved",
        tenantSlug: "demo",
      });

      const result = await submitFeedbackAction(initialState, fd);
      expect(result.success).toBe(true);
    });
  });
});
