import { describe, it, expect } from "vitest";

import {
  createTicketSchema,
  ticketFilterSchema,
  assignTicketSchema,
} from "../../lib/tickets/schemas";

describe("createTicketSchema", () => {
  const validInput = {
    title: "Problema no sistema",
    category: "TI" as const,
    description: "Descrição detalhada do problema encontrado no sistema.",
  };

  it("aceita dados válidos", () => {
    const result = createTicketSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejeita título com menos de 5 caracteres", () => {
    const result = createTicketSchema.safeParse({ ...validInput, title: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejeita categoria inválida", () => {
    const result = createTicketSchema.safeParse({
      ...validInput,
      category: "Inexistente",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita descrição com menos de 10 caracteres", () => {
    const result = createTicketSchema.safeParse({
      ...validInput,
      description: "Curta",
    });
    expect(result.success).toBe(false);
  });
});

describe("ticketFilterSchema", () => {
  it("aceita filtros válidos", () => {
    const result = ticketFilterSchema.safeParse({
      status: "open",
      search: "teste",
    });
    expect(result.success).toBe(true);
  });

  it("aceita filtros vazios", () => {
    const result = ticketFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("assignTicketSchema", () => {
  const validInput = {
    ticketId: "tkt_001",
    adminUserId: "u_01",
  };

  it("aceita dados válidos", () => {
    const result = assignTicketSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("aceita ticketId com mais de 3 dígitos", () => {
    const result = assignTicketSchema.safeParse({
      ...validInput,
      ticketId: "tkt_1234",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita ticketId vazio", () => {
    const result = assignTicketSchema.safeParse({
      ...validInput,
      ticketId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita adminUserId vazio", () => {
    const result = assignTicketSchema.safeParse({
      ...validInput,
      adminUserId: "",
    });
    expect(result.success).toBe(false);
  });
});
