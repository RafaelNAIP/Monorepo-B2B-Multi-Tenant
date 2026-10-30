import { describe, it, expect, beforeEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";
import { makeFormData } from "../helpers/form-data";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

// Mock next/cache para revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createTicketAction,
  assignTicketAction,
} from "../../lib/tickets/actions";
import { getTicketById } from "../../lib/tickets/data";

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
    resetPrismaMocks();
  });

  it("cria chamado com dados válidos e retorna success", async () => {
    prismaMock.ticket.count.mockResolvedValue(8);
    prismaMock.ticket.create.mockResolvedValue({
      id: "new_id",
      code: "tkt_009",
      title: validCreateFields.title,
      requester: validCreateFields.requester,
      status: "open",
      priority: "medium",
      category: "financeiro",
      description: validCreateFields.description,
      tenantId: "t_01",
      assignedTo: null,
      disconnectedAt: null,
      feedbackDeadline: null,
      relatedTicketId: null,
      closedReason: null,
      createdAt: new Date(),
    });

    const formData = makeFormData(validCreateFields);
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.fieldErrors).toEqual({});
  });

  it("chamado criado via action chama prisma.ticket.create", async () => {
    prismaMock.ticket.count.mockResolvedValue(8);
    prismaMock.ticket.create.mockResolvedValue({
      id: "new_id",
      code: "tkt_009",
      title: validCreateFields.title,
      requester: validCreateFields.requester,
      status: "open",
      priority: "medium",
      category: "financeiro",
      description: validCreateFields.description,
      tenantId: "t_01",
      assignedTo: null,
      disconnectedAt: null,
      feedbackDeadline: null,
      relatedTicketId: null,
      closedReason: null,
      createdAt: new Date(),
    });

    const formData = makeFormData(validCreateFields);
    await createTicketAction(createInitialState, formData);

    expect(prismaMock.ticket.create).toHaveBeenCalledOnce();
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

  const TENANT = validCreateFields.tenantId;
  const createdTicket = {
    id: "tkt_new",
    code: "tkt_001",
    title: validCreateFields.title,
    requester: validCreateFields.requester,
    status: "open",
    priority: "medium",
    category: "financeiro",
    description: validCreateFields.description,
    tenantId: TENANT,
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
    createdAt: new Date(),
  };

  it("cria chamado associando os anexos enviados ao R2", async () => {
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.ticket.create.mockResolvedValue(createdTicket);
    prismaMock.attachment.findMany.mockResolvedValue([
      { id: "A1", fileKey: `${TENANT}/novo/a.png`, tenantId: TENANT, status: "pending", ticketId: null, messageId: null },
      { id: "A2", fileKey: `${TENANT}/novo/b.pdf`, tenantId: TENANT, status: "pending", ticketId: null, messageId: null },
    ]);
    prismaMock.attachment.updateMany.mockResolvedValue({ count: 2 });

    const formData = makeFormData({
      ...validCreateFields,
      attachmentKeys: JSON.stringify([`${TENANT}/novo/a.png`, `${TENANT}/novo/b.pdf`]),
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(true);
    const updateArg = prismaMock.attachment.updateMany.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: { in: ["A1", "A2"] } });
    expect(updateArg.data.ticketId).toBe("tkt_new");
  });

  it("cria chamado sem anexos sem tocar na tabela de anexos", async () => {
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.ticket.create.mockResolvedValue(createdTicket);

    const result = await createTicketAction(createInitialState, makeFormData(validCreateFields));

    expect(result.success).toBe(true);
    expect(prismaMock.attachment.updateMany).not.toHaveBeenCalled();
  });

  it("rejeita attachmentKeys que não seja JSON de lista", async () => {
    const formData = makeFormData({ ...validCreateFields, attachmentKeys: "{nao-json" });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.attachmentKeys?.[0]).toBe("Anexos inválidos");
    expect(prismaMock.ticket.create).not.toHaveBeenCalled();
  });

  it("rejeita mais de 5 anexos", async () => {
    const keys = Array.from({ length: 6 }, (_, i) => `${TENANT}/novo/${i}.png`);
    const formData = makeFormData({ ...validCreateFields, attachmentKeys: JSON.stringify(keys) });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors.attachmentKeys).toBeDefined();
    expect(prismaMock.ticket.create).not.toHaveBeenCalled();
  });

  it("falha sem sucesso quando algum anexo é inválido, expirado ou de outro tenant", async () => {
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.ticket.create.mockResolvedValue(createdTicket);
    // findMany retorna só 1 dos 2 (o do outro tenant não existe)
    prismaMock.attachment.findMany.mockResolvedValue([
      { id: "A1", fileKey: `${TENANT}/novo/a.png`, tenantId: TENANT, status: "pending", ticketId: null, messageId: null },
    ]);
    prismaMock.attachment.updateMany.mockResolvedValue({ count: 1 });

    const formData = makeFormData({
      ...validCreateFields,
      attachmentKeys: JSON.stringify([`${TENANT}/novo/a.png`, "outro-tenant/novo/b.png"]),
    });
    const result = await createTicketAction(createInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Um ou mais anexos são inválidos ou expiraram. Envie os arquivos novamente.");
  });

  it("não chama prisma.ticket.create quando validação falha", async () => {
    const formData = makeFormData({
      ...validCreateFields,
      title: "Ab",
    });

    await createTicketAction(createInitialState, formData);

    expect(prismaMock.ticket.create).not.toHaveBeenCalled();
  });
});

// ─── assignTicketAction ────────────────────────────────────────────

describe("assignTicketAction", () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  const openTicket = {
    id: "tkt_001",
    code: "tkt_001",
    title: "Sistema de login não responde",
    requester: "Maria Oliveira",
    status: "open",
    priority: "high",
    category: "suporte_tecnico",
    description: "O sistema de login parou de funcionar.",
    tenantId: "t_01",
    assignedTo: null,
    disconnectedAt: null,
    feedbackDeadline: null,
    relatedTicketId: null,
    closedReason: null,
    createdAt: new Date(),
  };

  it("atribui chamado aberto com sucesso", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(openTicket);
    prismaMock.ticket.update.mockResolvedValue({
      ...openTicket,
      assignedTo: "u_01",
      status: "in_progress",
    });

    const formData = makeFormData({
      ticketId: "tkt_001",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    const result = await assignTicketAction(assignInitialState, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("chamado atribuído muda para in_progress via Prisma", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(openTicket);
    prismaMock.ticket.update.mockResolvedValue({
      ...openTicket,
      assignedTo: "u_01",
      status: "in_progress",
    });

    const formData = makeFormData({
      ticketId: "tkt_001",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    await assignTicketAction(assignInitialState, formData);

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: "tkt_001" },
      data: { assignedTo: "u_01", status: "in_progress" },
    });
  });

  it("retorna erro para chamado inexistente", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);

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
    const inProgressTicket = { ...openTicket, status: "in_progress", assignedTo: "u_01" };
    prismaMock.ticket.findUnique.mockResolvedValue(inProgressTicket);

    const formData = makeFormData({
      ticketId: "tkt_002",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    const result = await assignTicketAction(assignInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });

  it("retorna erro para ticketId inexistente", async () => {
    const formData = makeFormData({
      ticketId: "invalido",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    const result = await assignTicketAction(assignInitialState, formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
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

  it("não chama prisma.ticket.update quando validação falha", async () => {
    const formData = makeFormData({
      ticketId: "invalido",
      adminUserId: "u_01",
      tenantSlug: "demo",
    });

    await assignTicketAction(assignInitialState, formData);

    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
  });
});
