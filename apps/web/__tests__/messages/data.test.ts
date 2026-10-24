import { describe, it, expect, beforeEach } from "vitest";

import {
  getMessagesByTicket,
  createMessage,
  getThreadAccessByToken,
  getThreadAccessByTicket,
  createThreadAccess,
  resetMessages,
} from "../../lib/messages/data";

describe("data layer de mensagens", () => {
  beforeEach(() => {
    resetMessages();
  });

  // ─── createMessage ─────────────────────────────────────────────

  describe("createMessage", () => {
    it("cria uma mensagem e retorna com ID gerado", () => {
      const msg = createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "João Admin",
        content: "Olá, como posso ajudar?",
      });

      expect(msg.id).toBeDefined();
      expect(msg.id).toMatch(/^msg_/);
      expect(msg.ticketId).toBe("tkt_001");
      expect(msg.tenantId).toBe("t_01");
      expect(msg.senderRole).toBe("admin");
      expect(msg.senderName).toBe("João Admin");
      expect(msg.content).toBe("Olá, como posso ajudar?");
      expect(msg.createdAt).toBeDefined();
    });

    it("gera IDs sequenciais", () => {
      const msg1 = createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Primeira",
      });
      const msg2 = createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "client",
        senderName: "Cliente",
        content: "Segunda",
      });

      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  // ─── getMessagesByTicket ───────────────────────────────────────

  describe("getMessagesByTicket", () => {
    it("retorna mensagens do ticket informado", () => {
      createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Mensagem 1",
      });
      createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "client",
        senderName: "Cliente",
        content: "Mensagem 2",
      });

      const msgs = getMessagesByTicket("tkt_001");
      expect(msgs).toHaveLength(2);
      expect(msgs.every((m) => m.ticketId === "tkt_001")).toBe(true);
    });

    it("retorna array vazio para ticket sem mensagens", () => {
      const msgs = getMessagesByTicket("tkt_999");
      expect(msgs).toEqual([]);
    });

    it("não retorna mensagens de outros tickets", () => {
      createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Mensagem do ticket 1",
      });
      createMessage({
        ticketId: "tkt_002",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Mensagem do ticket 2",
      });

      const msgs = getMessagesByTicket("tkt_001");
      expect(msgs).toHaveLength(1);
      expect(msgs[0]!.content).toBe("Mensagem do ticket 1");
    });

    it("retorna mensagens ordenadas por data de criação", () => {
      createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Primeira",
      });
      createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "client",
        senderName: "Cliente",
        content: "Segunda",
      });

      const msgs = getMessagesByTicket("tkt_001");
      expect(msgs[0]!.content).toBe("Primeira");
      expect(msgs[1]!.content).toBe("Segunda");
    });
  });

  // ─── createThreadAccess ────────────────────────────────────────

  describe("createThreadAccess", () => {
    it("cria um acesso de thread com token gerado", () => {
      const access = createThreadAccess({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "Maria Oliveira",
        clientEmail: "maria@exemplo.com",
      });

      expect(access.id).toBeDefined();
      expect(access.token).toBeDefined();
      expect(access.token.length).toBeGreaterThan(10);
      expect(access.ticketId).toBe("tkt_001");
      expect(access.tenantId).toBe("t_01");
      expect(access.clientName).toBe("Maria Oliveira");
      expect(access.clientEmail).toBe("maria@exemplo.com");
      expect(access.createdAt).toBeDefined();
    });

    it("gera tokens únicos para cada acesso", () => {
      const a1 = createThreadAccess({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "Maria",
        clientEmail: "maria@exemplo.com",
      });
      const a2 = createThreadAccess({
        ticketId: "tkt_002",
        tenantId: "t_01",
        clientName: "João",
        clientEmail: "joao@exemplo.com",
      });

      expect(a1.token).not.toBe(a2.token);
    });

    it("substitui acesso existente para o mesmo ticket", () => {
      const first = createThreadAccess({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "Maria",
        clientEmail: "maria@exemplo.com",
      });
      const second = createThreadAccess({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "João",
        clientEmail: "joao@exemplo.com",
      });

      // O segundo deve substituir o primeiro
      const found = getThreadAccessByTicket("tkt_001");
      expect(found).toBeDefined();
      expect(found!.clientName).toBe("João");
      expect(found!.token).toBe(second.token);
      expect(found!.token).not.toBe(first.token);
    });
  });

  // ─── getThreadAccessByToken ────────────────────────────────────

  describe("getThreadAccessByToken", () => {
    it("retorna o acesso pelo token", () => {
      const created = createThreadAccess({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "Maria",
        clientEmail: "maria@exemplo.com",
      });

      const found = getThreadAccessByToken(created.token);
      expect(found).toBeDefined();
      expect(found!.ticketId).toBe("tkt_001");
      expect(found!.clientName).toBe("Maria");
    });

    it("retorna undefined para token inexistente", () => {
      const found = getThreadAccessByToken("token_invalido");
      expect(found).toBeUndefined();
    });
  });

  // ─── getThreadAccessByTicket ───────────────────────────────────

  describe("getThreadAccessByTicket", () => {
    it("retorna o acesso pelo ticketId", () => {
      createThreadAccess({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "Maria",
        clientEmail: "maria@exemplo.com",
      });

      const found = getThreadAccessByTicket("tkt_001");
      expect(found).toBeDefined();
      expect(found!.clientName).toBe("Maria");
    });

    it("retorna undefined para ticket sem acesso criado", () => {
      const found = getThreadAccessByTicket("tkt_999");
      expect(found).toBeUndefined();
    });
  });

  // ─── resetMessages ─────────────────────────────────────────────

  describe("resetMessages", () => {
    it("limpa todas as mensagens e acessos", () => {
      createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Teste",
      });
      createThreadAccess({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "Maria",
        clientEmail: "maria@exemplo.com",
      });

      resetMessages();

      expect(getMessagesByTicket("tkt_001")).toEqual([]);
      expect(getThreadAccessByTicket("tkt_001")).toBeUndefined();
    });
  });
});
