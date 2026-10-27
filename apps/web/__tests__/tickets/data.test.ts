import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

import {
  getTickets,
  createTicket,
  getTicketById,
  assignTicket,
} from "../../lib/tickets/data";

// ─── Fixtures ────────────────────────────────────────────────────────

const MOCK_TICKETS_T01 = [
  {
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
  },
  {
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
  },
  {
    id: "tkt_003",
    code: "tkt_003",
    title: "Solicitação de novo monitor",
    requester: "Ana Costa",
    status: "open",
    priority: "low",
    category: "ti",
    description: "Preciso de um monitor extra para trabalho com planilhas.",
    createdAt: new Date("2024-11-03T09:15:00Z"),
    tenantId: "t_01",
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
  {
    id: "tkt_004",
    code: "tkt_004",
    title: "Atualização de dados cadastrais",
    requester: "Pedro Lima",
    status: "resolved",
    priority: "low",
    category: "rh",
    description: "Preciso atualizar meu endereço e telefone no sistema.",
    createdAt: new Date("2024-11-04T11:00:00Z"),
    tenantId: "t_01",
    assignedTo: "u_01",
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
  },
];

describe("data layer de tickets", () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  // ─── getTickets ─────────────────────────────────────────────────

  describe("getTickets", () => {
    it("retorna todos os chamados do tenant", async () => {
      prismaMock.ticket.findMany.mockResolvedValue(MOCK_TICKETS_T01);

      const tickets = await getTickets("t_01");
      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets.every((t) => t.tenantId === "t_01")).toBe(true);
    });

    it("retorna array vazio para tenant sem chamados", async () => {
      prismaMock.ticket.findMany.mockResolvedValue([]);

      const tickets = await getTickets("t_inexistente");
      expect(tickets).toEqual([]);
    });

    it("filtra por status", async () => {
      const openTickets = MOCK_TICKETS_T01.filter((t) => t.status === "open");
      prismaMock.ticket.findMany.mockResolvedValue(openTickets);

      const tickets = await getTickets("t_01", { status: "open" });
      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets.every((t) => t.status === "open")).toBe(true);
    });

    it("filtra por busca no título (case-insensitive)", async () => {
      const filtered = MOCK_TICKETS_T01.filter((t) =>
        t.title.toLowerCase().includes("siste")
      );
      prismaMock.ticket.findMany.mockResolvedValue(filtered);

      const tickets = await getTickets("t_01", { search: "siste" });
      expect(tickets.length).toBeGreaterThan(0);
      expect(
        tickets.every(
          (t) =>
            t.title.toLowerCase().includes("siste") ||
            t.requester.toLowerCase().includes("siste")
        )
      ).toBe(true);
    });

    it("filtra por busca no solicitante", async () => {
      const filtered = MOCK_TICKETS_T01.filter((t) =>
        t.requester.toLowerCase().includes("maria")
      );
      prismaMock.ticket.findMany.mockResolvedValue(filtered);

      const tickets = await getTickets("t_01", { search: "maria" });
      expect(tickets.length).toBeGreaterThan(0);
    });

    it("combina filtro de status e busca", async () => {
      const openTickets = MOCK_TICKETS_T01.filter((t) => t.status === "open");
      prismaMock.ticket.findMany.mockResolvedValue(openTickets);

      const tickets = await getTickets("t_01", { status: "open", search: "" });
      expect(tickets.every((t) => t.status === "open")).toBe(true);
    });

    it("retorna vazio quando nenhum chamado combina com os filtros", async () => {
      prismaMock.ticket.findMany.mockResolvedValue([]);

      const tickets = await getTickets("t_01", {
        search: "xyztermoqueexisteemnenhum",
      });
      expect(tickets).toEqual([]);
    });
  });

  // ─── getTicketById ──────────────────────────────────────────────

  describe("getTicketById", () => {
    it("retorna o chamado pelo ID", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(MOCK_TICKETS_T01[0]);

      const found = await getTicketById("tkt_001");
      expect(found).toBeDefined();
      expect(found!.id).toBe("tkt_001");
      expect(found!.title).toBe("Sistema de login não responde");
    });

    it("retorna null para ID inexistente", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const found = await getTicketById("id_inexistente");
      expect(found).toBeNull();
    });
  });

  // ─── createTicket ───────────────────────────────────────────────

  describe("createTicket", () => {
    it("cria um chamado e retorna com ID gerado", async () => {
      const created = {
        id: "new_id",
        code: "tkt_009",
        title: "Novo chamado de teste",
        requester: "Usuário Teste",
        status: "open",
        priority: "medium",
        category: "ti",
        description: "Descrição detalhada do problema encontrado.",
        tenantId: "t_01",
        assignedTo: null,
        disconnectedAt: null,
        feedbackDeadline: null,
        relatedTicketId: null,
        closedReason: null,
        createdAt: new Date(),
      };
      prismaMock.ticket.count.mockResolvedValue(8);
      prismaMock.ticket.create.mockResolvedValue(created);

      const ticket = await createTicket({
        title: "Novo chamado de teste",
        category: "TI",
        description: "Descrição detalhada do problema encontrado.",
        tenantId: "t_01",
        requester: "Usuário Teste",
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.title).toBe("Novo chamado de teste");
      expect(ticket.status).toBe("open");
      expect(ticket.priority).toBe("medium");
      expect(ticket.assignedTo).toBeNull();
      expect(ticket.createdAt).toBeDefined();
      expect(prismaMock.ticket.create).toHaveBeenCalledOnce();
    });

    it("chamado criado é encontrável por getTicketById", async () => {
      const created = {
        id: "new_id",
        code: "tkt_009",
        title: "Chamado rastreável",
        requester: "Usuário Rastreável",
        status: "open",
        priority: "medium",
        category: "comercial",
        description: "Deve ser encontrável após criação pelo ID.",
        tenantId: "t_01",
        assignedTo: null,
        disconnectedAt: null,
        feedbackDeadline: null,
        relatedTicketId: null,
        closedReason: null,
        createdAt: new Date(),
      };
      prismaMock.ticket.count.mockResolvedValue(8);
      prismaMock.ticket.create.mockResolvedValue(created);
      prismaMock.ticket.findUnique.mockResolvedValue(created);

      const ticket = await createTicket({
        title: "Chamado rastreável",
        category: "Comercial",
        description: "Deve ser encontrável após criação pelo ID.",
        tenantId: "t_01",
        requester: "Usuário Rastreável",
      });

      const found = await getTicketById(ticket.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe("Chamado rastreável");
    });
  });

  // ─── assignTicket ──────────────────────────────────────────────

  describe("assignTicket", () => {
    it("atribui um chamado aberto ao admin e muda status para em andamento", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(MOCK_TICKETS_T01[0]); // open
      prismaMock.ticket.update.mockResolvedValue({
        ...MOCK_TICKETS_T01[0],
        assignedTo: "u_01",
        status: "in_progress",
      });

      const result = await assignTicket("tkt_001", "u_01");
      expect(result).not.toBeNull();
      expect(result!.assignedTo).toBe("u_01");
      expect(result!.status).toBe("in_progress");
    });

    it("retorna null para chamado inexistente", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      const result = await assignTicket("tkt_999", "u_01");
      expect(result).toBeNull();
    });

    it("retorna null para chamado que não está aberto (in_progress)", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(MOCK_TICKETS_T01[1]); // in_progress

      const result = await assignTicket("tkt_002", "u_01");
      expect(result).toBeNull();
    });

    it("retorna null para chamado que não está aberto (resolved)", async () => {
      prismaMock.ticket.findUnique.mockResolvedValue(MOCK_TICKETS_T01[3]); // resolved

      const result = await assignTicket("tkt_004", "u_01");
      expect(result).toBeNull();
    });

    it("permite atribuir chamados diferentes ao mesmo admin", async () => {
      prismaMock.ticket.findUnique
        .mockResolvedValueOnce(MOCK_TICKETS_T01[0])
        .mockResolvedValueOnce(MOCK_TICKETS_T01[2]);
      prismaMock.ticket.update
        .mockResolvedValueOnce({ ...MOCK_TICKETS_T01[0], assignedTo: "u_01", status: "in_progress" })
        .mockResolvedValueOnce({ ...MOCK_TICKETS_T01[2], assignedTo: "u_01", status: "in_progress" });

      const r1 = await assignTicket("tkt_001", "u_01");
      const r3 = await assignTicket("tkt_003", "u_01");

      expect(r1).not.toBeNull();
      expect(r3).not.toBeNull();
      expect(r1!.assignedTo).toBe("u_01");
      expect(r3!.assignedTo).toBe("u_01");
    });
  });
});
