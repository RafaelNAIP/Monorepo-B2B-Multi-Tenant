import { describe, it, expect } from "vitest";

import {
  createMessageSchema,
  createThreadAccessSchema,
  feedbackSchema,
} from "../../lib/messages/schemas";

// ─── createMessageSchema ─────────────────────────────────────────

describe("createMessageSchema", () => {
  const validInput = {
    ticketId: "tkt_001",
    tenantId: "t_01",
    senderRole: "admin" as const,
    senderName: "João Admin",
    content: "Olá, como posso ajudar?",
  };

  it("aceita dados válidos com role admin", () => {
    const result = createMessageSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("aceita dados válidos com role client", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      senderRole: "client",
      senderName: "Maria Cliente",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita role inválido", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      senderRole: "manager",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita conteúdo vazio", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita conteúdo apenas com espaços", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      content: "   ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const contentErrors = result.error.flatten().fieldErrors.content;
      expect(contentErrors).toBeDefined();
    }
  });

  it("rejeita conteúdo com mais de 5000 caracteres", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      content: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita ticketId vazio", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      ticketId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita tenantId vazio", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      tenantId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senderName vazio", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      senderName: "",
    });
    expect(result.success).toBe(false);
  });

  it("aplica trim no conteúdo", () => {
    const result = createMessageSchema.safeParse({
      ...validInput,
      content: "  Mensagem com espaços  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("Mensagem com espaços");
    }
  });
});

// ─── createThreadAccessSchema ────────────────────────────────────

describe("createThreadAccessSchema", () => {
  const validInput = {
    ticketId: "tkt_001",
    tenantId: "t_01",
    clientName: "Maria Oliveira",
    clientEmail: "maria@exemplo.com",
  };

  it("aceita dados válidos", () => {
    const result = createThreadAccessSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejeita email inválido", () => {
    const result = createThreadAccessSchema.safeParse({
      ...validInput,
      clientEmail: "email-invalido",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita clientName vazio", () => {
    const result = createThreadAccessSchema.safeParse({
      ...validInput,
      clientName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita clientName com menos de 2 caracteres", () => {
    const result = createThreadAccessSchema.safeParse({
      ...validInput,
      clientName: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita tenantId vazio", () => {
    const result = createThreadAccessSchema.safeParse({
      ...validInput,
      tenantId: "",
    });
    expect(result.success).toBe(false);
  });

  it("aplica trim no nome do cliente", () => {
    const result = createThreadAccessSchema.safeParse({
      ...validInput,
      clientName: "  Maria Oliveira  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientName).toBe("Maria Oliveira");
    }
  });
});

// ─── feedbackSchema ──────────────────────────────────────────────

describe("feedbackSchema", () => {
  it("aceita feedback 'resolved'", () => {
    const result = feedbackSchema.safeParse({
      ticketId: "tkt_001",
      resolution: "resolved",
    });
    expect(result.success).toBe(true);
  });

  it("aceita feedback 'unresolved'", () => {
    const result = feedbackSchema.safeParse({
      ticketId: "tkt_001",
      resolution: "unresolved",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita resolution inválido", () => {
    const result = feedbackSchema.safeParse({
      ticketId: "tkt_001",
      resolution: "maybe",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita sem resolution", () => {
    const result = feedbackSchema.safeParse({
      ticketId: "tkt_001",
    });
    expect(result.success).toBe(false);
  });
});
