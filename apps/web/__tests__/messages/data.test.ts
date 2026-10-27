import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

import {
  getMessagesByTicket,
  createMessage,
  getThreadAccessByToken,
  getThreadAccessByTicket,
  createThreadAccess,
} from "../../lib/messages/data";

// ─── Fixtures ────────────────────────────────────────────────────────

const MOCK_MESSAGES = [
  {
    id: "msg_001",
    ticketId: "tkt_001",
    tenantId: "t_01",
    senderRole: "admin",
    senderName: "João Admin",
    content: "Olá, como posso ajudar?",
    createdAt: new Date("2024-11-01T10:00:00Z"),
  },
  {
    id: "msg_002",
    ticketId: "tkt_001",
    tenantId: "t_01",
    senderRole: "client",
    senderName: "Maria Cliente",
    content: "Preciso de suporte no sistema",
    createdAt: new Date("2024-11-01T10:05:00Z"),
  },
];

const MOCK_THREAD_ACCESS = {
  id: "ta_001",
  ticketId: "tkt_001",
  tenantId: "t_01",
  token: "abc123token456def789ghi012jkl345",
  clientName: "Maria Oliveira",
  clientEmail: "maria@exemplo.com",
  createdAt: new Date("2024-11-01T10:00:00Z"),
};

describe("data layer de mensagens", () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  // ─── createMessage ─────────────────────────────────────────────

  describe("createMessage", () => {
    it("cria uma mensagem e retorna com ID gerado", async () => {
      const created = {
        id: "msg_new",
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "João Admin",
        content: "Olá, como posso ajudar?",
        createdAt: new Date(),
      };
      prismaMock.message.create.mockResolvedValue(created);

      const msg = await createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "João Admin",
        content: "Olá, como posso ajudar?",
      });

      expect(msg.id).toBeDefined();
      expect(msg.ticketId).toBe("tkt_001");
      expect(msg.tenantId).toBe("t_01");
      expect(msg.senderRole).toBe("admin");
      expect(msg.senderName).toBe("João Admin");
      expect(msg.content).toBe("Olá, como posso ajudar?");
      expect(msg.createdAt).toBeDefined();
    });

    it("chama prisma.message.create com os dados corretos", async () => {
      prismaMock.message.create.mockResolvedValue({
        id: "msg_new",
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Primeira",
        createdAt: new Date(),
      });

      await createMessage({
        ticketId: "tkt_001",
        tenantId: "t_01",
        senderRole: "admin",
        senderName: "Admin",
        content: "Primeira",
      });

      expect(prismaMock.message.create).toHaveBeenCalledOnce();
      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          ticketId: "tkt_001",
          tenantId: "t_01",
          senderRole: "admin",
          senderName: "Admin",
          content: "Primeira",
        },
      });
    });
  });

  // ─── getMessagesByTicket ───────────────────────────────────────

  describe("getMessagesByTicket", () => {
    it("retorna mensagens do ticket informado", async () => {
      prismaMock.message.findMany.mockResolvedValue(MOCK_MESSAGES);

      const msgs = await getMessagesByTicket("tkt_001");
      expect(msgs).toHaveLength(2);
      expect(msgs.every((m) => m.ticketId === "tkt_001")).toBe(true);
    });

    it("retorna array vazio para ticket sem mensagens", async () => {
      prismaMock.message.findMany.mockResolvedValue([]);

      const msgs = await getMessagesByTicket("tkt_999");
      expect(msgs).toEqual([]);
    });

    it("chama prisma.message.findMany com orderBy createdAt asc", async () => {
      prismaMock.message.findMany.mockResolvedValue([]);

      await getMessagesByTicket("tkt_001");

      expect(prismaMock.message.findMany).toHaveBeenCalledWith({
        where: { ticketId: "tkt_001" },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  // ─── createThreadAccess ────────────────────────────────────────

  describe("createThreadAccess", () => {
    it("cria um acesso de thread e retorna com token", async () => {
      prismaMock.threadAccess.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.threadAccess.create.mockResolvedValue(MOCK_THREAD_ACCESS);

      const access = await createThreadAccess({
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

    it("remove acesso anterior do mesmo ticket antes de criar novo", async () => {
      prismaMock.threadAccess.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.threadAccess.create.mockResolvedValue(MOCK_THREAD_ACCESS);

      await createThreadAccess({
        ticketId: "tkt_001",
        tenantId: "t_01",
        clientName: "João",
        clientEmail: "joao@exemplo.com",
      });

      expect(prismaMock.threadAccess.deleteMany).toHaveBeenCalledWith({
        where: { ticketId: "tkt_001" },
      });
      expect(prismaMock.threadAccess.create).toHaveBeenCalledOnce();
    });
  });

  // ─── getThreadAccessByToken ────────────────────────────────────

  describe("getThreadAccessByToken", () => {
    it("retorna o acesso pelo token", async () => {
      prismaMock.threadAccess.findFirst.mockResolvedValue(MOCK_THREAD_ACCESS);

      const found = await getThreadAccessByToken("abc123token456def789ghi012jkl345");
      expect(found).toBeDefined();
      expect(found!.ticketId).toBe("tkt_001");
      expect(found!.clientName).toBe("Maria Oliveira");
    });

    it("retorna null para token inexistente", async () => {
      prismaMock.threadAccess.findFirst.mockResolvedValue(null);

      const found = await getThreadAccessByToken("token_invalido");
      expect(found).toBeNull();
    });
  });

  // ─── getThreadAccessByTicket ───────────────────────────────────

  describe("getThreadAccessByTicket", () => {
    it("retorna o acesso pelo ticketId", async () => {
      prismaMock.threadAccess.findFirst.mockResolvedValue(MOCK_THREAD_ACCESS);

      const found = await getThreadAccessByTicket("tkt_001");
      expect(found).toBeDefined();
      expect(found!.clientName).toBe("Maria Oliveira");
    });

    it("retorna null para ticket sem acesso criado", async () => {
      prismaMock.threadAccess.findFirst.mockResolvedValue(null);

      const found = await getThreadAccessByTicket("tkt_999");
      expect(found).toBeNull();
    });
  });
});
