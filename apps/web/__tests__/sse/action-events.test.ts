import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";
import { makeFormData } from "../helpers/form-data";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  sendMessageAction,
  submitFeedbackAction,
} from "../../lib/messages/actions";
import {
  assignTicketAction,
  disconnectTicketAction,
} from "../../lib/tickets/actions";
import { checkAutoClose } from "../../lib/tickets/data";
import {
  threadEventEmitter,
  type ThreadEvent,
} from "../../lib/sse/thread-event-emitter";

/**
 * As actions, a camada de dados e o emitter são os REAIS. Só o Prisma é
 * substituído. Cada teste se inscreve no emitter como o endpoint SSE faria
 * e verifica o que um cliente conectado receberia de fato.
 */

const TICKET = "tkt_ev_1";
const initialState = { success: false, error: null, fieldErrors: {} };
const assignInitial = { success: false, error: null };

let received: ThreadEvent[];
let others: ThreadEvent[];
let unsubscribe: Array<() => void>;

beforeEach(() => {
  resetPrismaMocks();
  received = [];
  others = [];
  unsubscribe = [
    threadEventEmitter.subscribe(TICKET, (e) => received.push(e)),
    threadEventEmitter.subscribe("tkt_ev_other", (e) => others.push(e)),
  ];
});
afterEach(() => unsubscribe.forEach((u) => u()));

function messageForm(overrides: Record<string, string> = {}) {
  return makeFormData({
    ticketId: TICKET,
    tenantId: "t_01",
    senderRole: "admin",
    senderName: "Atendente",
    content: "Olá!",
    ...overrides,
  });
}

describe("sendMessageAction → new_message", () => {
  it("notifica quem está conectado à thread após salvar a mensagem", async () => {
    prismaMock.message.create.mockResolvedValue({ id: "m1" });

    const result = await sendMessageAction(initialState, messageForm());

    expect(result.success).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ type: "new_message", ticketId: TICKET });
    expect(typeof received[0].timestamp).toBe("number");
  });

  it("só notifica depois de persistir (o cliente relê o banco ao receber o evento)", async () => {
    const db: string[] = [];
    prismaMock.message.create.mockImplementation(async ({ data }) => {
      await Promise.resolve(); // persistência assíncrona de verdade
      db.push(data.content);
      return { id: "m1" };
    });
    let dbAtNotification: string[] = [];
    unsubscribe.push(
      threadEventEmitter.subscribe(TICKET, () => {
        dbAtNotification = [...db];
      })
    );

    await sendMessageAction(initialState, messageForm({ content: "persistida antes" }));

    expect(dbAtNotification).toEqual(["persistida antes"]);
  });

  it("não notifica threads de outros tickets", async () => {
    prismaMock.message.create.mockResolvedValue({ id: "m1" });
    await sendMessageAction(initialState, messageForm());
    expect(others).toHaveLength(0);
  });

  it("não notifica quando a validação falha", async () => {
    const result = await sendMessageAction(initialState, messageForm({ content: "   " }));

    expect(result.success).toBe(false);
    expect(prismaMock.message.create).not.toHaveBeenCalled();
    expect(received).toHaveLength(0);
  });

  it("não notifica quando o banco falha", async () => {
    prismaMock.message.create.mockRejectedValue(new Error("db fora do ar"));

    await expect(sendMessageAction(initialState, messageForm())).rejects.toThrow();

    expect(received).toHaveLength(0);
  });
});

describe("submitFeedbackAction → ticket_updated", () => {
  const form = () => makeFormData({ ticketId: TICKET, resolution: "resolved" });

  it("notifica quando o feedback é aceito", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({ id: TICKET, status: "pending_feedback" });
    prismaMock.ticket.update.mockResolvedValue({ id: TICKET, status: "resolved" });

    const result = await submitFeedbackAction(initialState, form());

    expect(result.success).toBe(true);
    expect(received.map((e) => e.type)).toEqual(["ticket_updated"]);
  });

  it("não notifica se o chamado não está aguardando feedback", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({ id: TICKET, status: "in_progress" });

    const result = await submitFeedbackAction(initialState, form());

    expect(result.success).toBe(false);
    expect(received).toHaveLength(0);
  });

  it("não notifica com dados inválidos", async () => {
    const result = await submitFeedbackAction(
      initialState,
      makeFormData({ ticketId: TICKET, resolution: "talvez" })
    );
    expect(result.success).toBe(false);
    expect(received).toHaveLength(0);
  });
});

describe("assignTicketAction → ticket_updated", () => {
  const form = () =>
    makeFormData({ ticketId: TICKET, adminUserId: "u_01", tenantSlug: "acme" });

  it("notifica quando o atendente assume o chamado", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({ id: TICKET, status: "open" });
    prismaMock.ticket.update.mockResolvedValue({ id: TICKET, status: "in_progress" });

    const result = await assignTicketAction(assignInitial, form());

    expect(result.success).toBe(true);
    expect(received.map((e) => e.type)).toEqual(["ticket_updated"]);
    expect(received[0].ticketId).toBe(TICKET);
  });

  it("não notifica se o chamado não está aberto", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({ id: TICKET, status: "in_progress" });

    const result = await assignTicketAction(assignInitial, form());

    expect(result.success).toBe(false);
    expect(received).toHaveLength(0);
  });

  it("não notifica com dados inválidos", async () => {
    const result = await assignTicketAction(assignInitial, makeFormData({}));
    expect(result.success).toBe(false);
    expect(received).toHaveLength(0);
  });
});

describe("disconnectTicketAction → thread_disconnected", () => {
  it("notifica quando o atendente encerra a conversa", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({ id: TICKET, status: "in_progress" });
    prismaMock.ticket.update.mockResolvedValue({ id: TICKET, status: "pending_feedback" });

    const result = await disconnectTicketAction(
      assignInitial,
      makeFormData({ ticketId: TICKET, tenantSlug: "acme" })
    );

    expect(result.success).toBe(true);
    expect(received.map((e) => e.type)).toEqual(["thread_disconnected"]);
  });

  it("não notifica se o chamado não está em andamento", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({ id: TICKET, status: "open" });

    const result = await disconnectTicketAction(
      assignInitial,
      makeFormData({ ticketId: TICKET })
    );

    expect(result.success).toBe(false);
    expect(received).toHaveLength(0);
  });

  it("não notifica sem ticketId", async () => {
    const result = await disconnectTicketAction(assignInitial, makeFormData({}));
    expect(result.success).toBe(false);
    expect(received).toHaveLength(0);
  });
});

describe("checkAutoClose → ticket_updated (fechamento por prazo expirado)", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  const future = new Date(Date.now() + 60_000).toISOString();

  it("notifica quem está conectado quando o prazo expirou e o chamado é fechado", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: TICKET,
      status: "pending_feedback",
      feedbackDeadline: past,
    });
    prismaMock.ticket.update.mockResolvedValue({ id: TICKET, status: "resolved" });

    const closed = await checkAutoClose(TICKET);

    expect(closed).not.toBeNull();
    expect(received.map((e) => e.type)).toEqual(["ticket_updated"]);
  });

  it("não notifica se o prazo ainda não expirou", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: TICKET,
      status: "pending_feedback",
      feedbackDeadline: future,
    });

    expect(await checkAutoClose(TICKET)).toBeNull();
    expect(received).toHaveLength(0);
  });

  it("não notifica se o chamado não está aguardando feedback", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: TICKET,
      status: "in_progress",
      feedbackDeadline: past,
    });

    expect(await checkAutoClose(TICKET)).toBeNull();
    expect(received).toHaveLength(0);
  });

  it("não notifica se o chamado não existe", async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);

    expect(await checkAutoClose(TICKET)).toBeNull();
    expect(received).toHaveLength(0);
  });
});
