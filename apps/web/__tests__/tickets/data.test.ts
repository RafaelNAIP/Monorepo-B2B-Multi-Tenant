import { describe, it, expect, beforeEach } from "vitest";

import {
  getTickets,
  createTicket,
  getTicketById,
  assignTicket,
  resetTickets,
} from "../../lib/tickets/data";

describe("data layer de tickets", () => {
  beforeEach(() => {
    resetTickets();
  });

  // ─── getTickets ─────────────────────────────────────────────────

  describe("getTickets", () => {
    it("retorna todos os chamados do tenant", () => {
      const tickets = getTickets("t_01");
      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets.every((t) => t.tenantId === "t_01")).toBe(true);
    });

    it("retorna array vazio para tenant sem chamados", () => {
      const tickets = getTickets("t_inexistente");
      expect(tickets).toEqual([]);
    });

    it("filtra por status", () => {
      const tickets = getTickets("t_01", { status: "open" });
      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets.every((t) => t.status === "open")).toBe(true);
    });

    it("filtra por busca no título (case-insensitive)", () => {
      const all = getTickets("t_01");
      const first = all[0]!;
      const searchTerm = first.title.substring(0, 5).toLowerCase();

      const filtered = getTickets("t_01", { search: searchTerm });
      expect(filtered.length).toBeGreaterThan(0);
      expect(
        filtered.every(
          (t) =>
            t.title.toLowerCase().includes(searchTerm) ||
            t.requester.toLowerCase().includes(searchTerm)
        )
      ).toBe(true);
    });

    it("filtra por busca no solicitante", () => {
      const all = getTickets("t_01");
      const first = all[0]!;
      const requesterName = first.requester.split(" ")[0]!.toLowerCase();

      const filtered = getTickets("t_01", { search: requesterName });
      expect(filtered.length).toBeGreaterThan(0);
    });

    it("combina filtro de status e busca", () => {
      const tickets = getTickets("t_01", {
        status: "open",
        search: "",
      });
      expect(tickets.every((t) => t.status === "open")).toBe(true);
    });

    it("retorna vazio quando nenhum chamado combina com os filtros", () => {
      const tickets = getTickets("t_01", {
        search: "xyztermoqueexisteemnenhum",
      });
      expect(tickets).toEqual([]);
    });
  });

  // ─── getTicketById ──────────────────────────────────────────────

  describe("getTicketById", () => {
    it("retorna o chamado pelo ID", () => {
      const all = getTickets("t_01");
      const first = all[0]!;

      const found = getTicketById(first.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(first.id);
      expect(found!.title).toBe(first.title);
    });

    it("retorna undefined para ID inexistente", () => {
      const found = getTicketById("id_inexistente");
      expect(found).toBeUndefined();
    });
  });

  // ─── createTicket ───────────────────────────────────────────────

  describe("createTicket", () => {
    it("cria um chamado e retorna com ID gerado", () => {
      const input = {
        title: "Novo chamado de teste",
        category: "TI" as const,
        description: "Descrição detalhada do problema encontrado.",
        tenantId: "t_01",
        requester: "Usuário Teste",
      };

      const ticket = createTicket(input);

      expect(ticket.id).toBeDefined();
      expect(ticket.id).toMatch(/^tkt_/);
      expect(ticket.title).toBe(input.title);
      expect(ticket.category).toBe(input.category);
      expect(ticket.description).toBe(input.description);
      expect(ticket.tenantId).toBe(input.tenantId);
      expect(ticket.requester).toBe(input.requester);
      expect(ticket.status).toBe("open");
      expect(ticket.priority).toBe("medium");
      expect(ticket.assignedTo).toBeNull();
      expect(ticket.createdAt).toBeDefined();
    });

    it("chamado criado aparece na listagem", () => {
      const before = getTickets("t_01").length;

      createTicket({
        title: "Chamado para contagem",
        category: "RH" as const,
        description: "Descrição para verificar que aparece na lista.",
        tenantId: "t_01",
        requester: "Usuário Contagem",
      });

      const after = getTickets("t_01").length;
      expect(after).toBe(before + 1);
    });

    it("chamado criado é encontrável por getTicketById", () => {
      const ticket = createTicket({
        title: "Chamado rastreável",
        category: "Comercial" as const,
        description: "Deve ser encontrável após criação pelo ID.",
        tenantId: "t_01",
        requester: "Usuário Rastreável",
      });

      const found = getTicketById(ticket.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe("Chamado rastreável");
    });
  });

  // ─── assignTicket ──────────────────────────────────────────────

  describe("assignTicket", () => {
    it("atribui um chamado aberto ao admin e muda status para em andamento", () => {
      // tkt_001 é open, assignedTo null
      const result = assignTicket("tkt_001", "u_01");

      expect(result).not.toBeNull();
      expect(result!.assignedTo).toBe("u_01");
      expect(result!.status).toBe("in_progress");
    });

    it("chamado atribuído persiste no store", () => {
      assignTicket("tkt_001", "u_01");

      const found = getTicketById("tkt_001");
      expect(found!.assignedTo).toBe("u_01");
      expect(found!.status).toBe("in_progress");
    });

    it("retorna null para chamado inexistente", () => {
      const result = assignTicket("tkt_999", "u_01");
      expect(result).toBeNull();
    });

    it("retorna null para chamado que não está aberto (in_progress)", () => {
      // tkt_002 já está in_progress
      const result = assignTicket("tkt_002", "u_01");
      expect(result).toBeNull();
    });

    it("retorna null para chamado que não está aberto (resolved)", () => {
      // tkt_004 é resolved
      const result = assignTicket("tkt_004", "u_01");
      expect(result).toBeNull();
    });

    it("permite atribuir chamados diferentes ao mesmo admin", () => {
      const r1 = assignTicket("tkt_001", "u_01");
      const r3 = assignTicket("tkt_003", "u_01");

      expect(r1).not.toBeNull();
      expect(r3).not.toBeNull();
      expect(r1!.assignedTo).toBe("u_01");
      expect(r3!.assignedTo).toBe("u_01");
    });
  });
});
