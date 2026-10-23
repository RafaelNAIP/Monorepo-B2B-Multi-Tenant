import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  createTicketAction,
  assignTicketAction,
} from "../../lib/tickets/actions";
import { resetTickets, getTickets, getTicketById } from "../../lib/tickets/data";

// Mock next/cache para revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Helper to create FormData from an object
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

const createInitialState = {
  success: false,
  error: null as string | null,
  fieldErrors: {} as Record<string, string[]>,
};

const assignInitialState = {
  success: false,
  error: null as string | null,
};

const validCreateFields = {
  title: "Problema no sistema de pagamentos",
  category: "Financeiro",
  description:
    "O sistema de pagamentos não está processando boletos corretamente.",
  tenantId: "t_01",
  requester: "Usuário de Teste",
};

describe("createTicketAction", () => {
  beforeEach(() => {
    resetTickets();
  });

  it("cria chamado com dados válidos e retorna success", async () => {
    const formData = makeFormData(validCreateFields);
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.fieldErrors).toEqual({});
  });

  it("chamado criado via action aparece na listagem", async () => {
    const before = getTickets("t_01").length;
    const formData = makeFormData(validCreateFields);

    await createTicketAction(createInitialState, formData);

    const after = getTickets("t_01").length;
    expect(after).toBe(before + 1);
  });

  it("retorna fieldErrors quando título é muito curto", async () => {
    const formData = makeFormData({
      ...validCreateFields,
      title: "Abc",
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.title).toBeDefined();
    expect(result.fieldErrors.title!.length).toBeGreaterThan(0);
  });

  it("retorna fieldErrors quando categoria é inválida", async () => {
    const formData = makeFormData({
      ...validCreateFields,
      category: "CategoriaInexistente",
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.category).toBeDefined();
  });

  it("retorna fieldErrors quando descrição é muito curta", async () => {
    const formData = makeFormData({
      ...validCreateFields,
      description: "Curta",
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.description).toBeDefined();
  });

  it("retorna fieldErrors para múltiplos campos inválidos", async () => {
    const formData = makeFormData({
      title: "Ab",
      category: "Inexistente",
      description: "Curta",
      tenantId: "t_01",
      requester: "Teste",
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.title).toBeDefined();
    expect(result.fieldErrors.category).toBeDefined();
    expect(result.fieldErrors.description).toBeDefined();
  });

  it("retorna fieldErrors quando campos obrigatórios estão vazios", async () => {
    const formData = makeFormData({
      title: "",
      category: "",
      description: "",
      tenantId: "t_01",
      requester: "Teste",
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(Object.keys(result.fieldErrors).length).toBeGreaterThanOrEqual(2);
  });

  it("aceita chamado com anexo válido (pdf)", async () => {
    const formData = makeFormData({
      ...validCreateFields,
      attachment: "documento.pdf",
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(true);
  });

  it("rejeita chamado com anexo de extensão inválida", async () => {
    const formData = makeFormData({
      ...validCreateFields,
      attachment: "malware.exe",
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.attachment).toBeDefined();
  });

  it("não cria chamado quando validação falha", async () => {
    const before = getTickets("t_01").length;
    const formData = makeFormData({
      ...validCreateFields,
      title: "Ab",
    });

    await createTicketAction(createInitialState, formData);

    const after = getTickets("t_01").length;
    expect(after).toBe(before);
  });
});

// ─── assignTicketAction ────────────────────────────────────────────

describe("assignTicketAction", () => {
  beforeEach(() => {
    resetTickets();
  });

  it("atribui chamado aberto com sucesso", async () => {
    const formData = makeFormData({
      ticketId: "tkt_001",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    const result = await assignTicketAction(assignInitialState, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("chamado atribuído muda para in_progress no store", async () => {
    const formData = makeFormData({
      ticketId: "tkt_001",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    await assignTicketAction(assignInitialState, formData);

    const ticket = getTicketById("tkt_001");
    expect(ticket!.status).toBe("in_progress");
    expect(ticket!.assignedTo).toBe("u_01");
  });

  it("retorna erro para chamado inexistente", async () => {
    const formData = makeFormData({
      ticketId: "tkt_999",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    const result = await assignTicketAction(assignInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });

  it("retorna erro para chamado que não está aberto", async () => {
    // tkt_002 está in_progress
    const formData = makeFormData({
      ticketId: "tkt_002",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    const result = await assignTicketAction(assignInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });

  it("retorna erro para ticketId com formato inválido", async () => {
    const formData = makeFormData({
      ticketId: "invalido",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    const result = await assignTicketAction(assignInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("inválidos");
  });

  it("retorna erro para adminUserId vazio", async () => {
    const formData = makeFormData({
      ticketId: "tkt_001",
      adminUserId: "",
      tenantSlug: "demo",
    });

    const result = await assignTicketAction(assignInitialState, formData);

    expect(result.success).toBe(false);
  });

  it("não altera chamado quando validação falha", async () => {
    const before = getTicketById("tkt_001");
    expect(before!.status).toBe("open");

    const formData = makeFormData({
      ticketId: "invalido",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    await assignTicketAction(assignInitialState, formData);

    const after = getTicketById("tkt_001");
    expect(after!.status).toBe("open");
    expect(after!.assignedTo).toBeNull();
  });
});
