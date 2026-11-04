import { describe, it, expect, vi, beforeEach } from "vitest";

import { makeFormData } from "../helpers/form-data";
import { mockRequireSession, resetAuthMocks, mockAdminSession } from "../helpers/mock-auth";
import { resetRateLimitStore } from "../../../../packages/auth/src/lib/rate-limit";

vi.mock("@empresa/auth", () => ({
  requireSession: (...args: unknown[]) => mockRequireSession(...args),
  getSession: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/sse/channel-singleton", () => ({ notifyThread: vi.fn() }));

const assignTicketMock = vi.fn();
vi.mock("@/lib/tickets/data", () => ({
  createTicket: vi.fn(),
  assignTicket: (...args: unknown[]) => assignTicketMock(...args),
  disconnectTicket: vi.fn(),
  submitTicketFeedback: vi.fn(),
  getTicketById: vi.fn(),
  checkAutoClose: vi.fn(),
}));

const createThreadAccessMock = vi.fn();
vi.mock("@/lib/messages/data", () => ({
  createThreadAccess: (...args: unknown[]) => createThreadAccessMock(...args),
  createMessage: vi.fn(),
  getMessagesByTicket: vi.fn(),
}));
vi.mock("@/lib/attachments/data", () => ({ ATTACHMENTS_INVALID: "ATTACHMENTS_INVALID" }));
vi.mock("@/lib/attachments/form", () => ({
  ATTACHMENTS_INVALID_MESSAGE: "anexos inválidos",
  parseAttachmentKeysField: () => [],
}));
vi.mock("../../lib/messages/actor", () => ({ resolveThreadActor: vi.fn() }));

const { assignTicketAction } = await import("../../lib/tickets/actions");
const { createThreadAccessAction } = await import("../../lib/messages/actions");

const RATE_LIMIT_MSG = /Muitas tentativas/;
const assignInitial = { success: false, error: null };
const accessInitial = { success: false, error: null, fieldErrors: {} };

const assignForm = () =>
  makeFormData({ ticketId: "tkt_1", adminUserId: "u_01" });

const accessForm = () =>
  makeFormData({
    ticketId: "tkt_1",
    clientName: "Cliente",
    clientEmail: "cliente@exemplo.com",
  });

beforeEach(() => {
  resetAuthMocks();
  resetRateLimitStore();
  assignTicketMock.mockReset();
  assignTicketMock.mockResolvedValue({ id: "tkt_1" });
  createThreadAccessMock.mockReset();
  createThreadAccessMock.mockResolvedValue({ token: "tok_abc" });
});

describe("assignTicketAction — rate limit crítico (20/min por sessão)", () => {
  it("permite 20 ações e bloqueia a 21ª", async () => {
    for (let i = 0; i < 20; i++) {
      const r = await assignTicketAction(assignInitial, assignForm());
      expect(r.success).toBe(true);
    }
    const blocked = await assignTicketAction(assignInitial, assignForm());

    expect(blocked.success).toBe(false);
    expect(blocked.error).toMatch(RATE_LIMIT_MSG);
  });

  it("bloqueio não executa a escrita (assignTicket não é chamado)", async () => {
    for (let i = 0; i < 20; i++) {
      await assignTicketAction(assignInitial, assignForm());
    }
    assignTicketMock.mockClear();

    await assignTicketAction(assignInitial, assignForm());

    expect(assignTicketMock).not.toHaveBeenCalled();
  });

  it("sessões diferentes têm orçamentos independentes", async () => {
    for (let i = 0; i < 20; i++) {
      await assignTicketAction(assignInitial, assignForm());
    }
    expect((await assignTicketAction(assignInitial, assignForm())).error).toMatch(RATE_LIMIT_MSG);

    mockRequireSession.mockResolvedValue({
      ok: true,
      session: { ...mockAdminSession, sub: "u_outro" },
    });
    const other = await assignTicketAction(assignInitial, assignForm());
    expect(other.success).toBe(true);
  });

  it("sessão não autenticada continua sendo barrada antes do rate limit", async () => {
    mockRequireSession.mockResolvedValue({
      ok: false,
      errorState: { success: false, error: "Sessão expirada", fieldErrors: {} },
    });
    const r = await assignTicketAction(assignInitial, assignForm());
    expect(r.error).toBe("Sessão expirada");
  });
});

describe("createThreadAccessAction — rate limit crítico (20/min por sessão)", () => {
  it("permite 20 ações e bloqueia a 21ª", async () => {
    for (let i = 0; i < 20; i++) {
      const r = await createThreadAccessAction(accessInitial, accessForm());
      expect(r.success).toBe(true);
    }
    const blocked = await createThreadAccessAction(accessInitial, accessForm());

    expect(blocked.success).toBe(false);
    expect(blocked.error).toMatch(RATE_LIMIT_MSG);
    expect(createThreadAccessMock).toHaveBeenCalledTimes(20);
  });
});
