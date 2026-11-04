import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────

const mockResolveThreadActor = vi.fn();
vi.mock("../../lib/messages/actor", () => ({
  resolveThreadActor: (...args: unknown[]) =>
    mockResolveThreadActor(...args),
}));

import { GET } from "../../app/api/threads/[ticketId]/events/route";
import { threadChannel } from "../../lib/sse/channel-singleton";

// ─── Helpers ────────────────────────────────────────────────────

const decoder = new TextDecoder();

/** Envia request ao handler. Para respostas de erro (não-SSE), não consome o body. */
async function openRaw(ticketId: string, token?: string) {
  const controller = new AbortController();
  const url = token
    ? `http://localhost/api/threads/${ticketId}/events?token=${token}`
    : `http://localhost/api/threads/${ticketId}/events`;

  const request = new Request(url, { signal: controller.signal });
  const response = await GET(request, {
    params: Promise.resolve({ ticketId }),
  });

  return { response, controller };
}

/** Abre stream SSE (assume status 200). */
async function open(ticketId: string, token?: string) {
  const { response, controller } = await openRaw(ticketId, token);
  const reader = response.body!.getReader();

  async function next(): Promise<string | null> {
    const { value, done } = await reader.read();
    return done ? null : decoder.decode(value);
  }

  return { response, reader, controller, next };
}

// ─── Fixtures ───────────────────────────────────────────────────

const adminActor = {
  ok: true as const,
  actor: { kind: "admin" as const, userId: "u1", tenantId: "t1" },
};

const clientActor = {
  ok: true as const,
  actor: {
    kind: "client" as const,
    token: "tok_valid",
    tenantId: "t1",
    clientName: "Maria",
  },
};

// ─── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
  mockResolveThreadActor.mockReset();
});

describe("GET /api/threads/[ticketId]/events — autenticação", () => {
  it("retorna 401 quando resolveThreadActor falha sem credenciais", async () => {
    mockResolveThreadActor.mockResolvedValue({
      ok: false,
      status: 401,
      message: "Autenticação necessária.",
    });

    const { response } = await openRaw("tkt_noauth");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Autenticação necessária.");
    expect(mockResolveThreadActor).toHaveBeenCalledWith("tkt_noauth", null);
  });

  it("retorna 403 quando token pertence a outro ticket", async () => {
    mockResolveThreadActor.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Token não pertence a este ticket.",
    });

    const { response } = await openRaw("tkt_wrong", "wrong-token");

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Token não pertence a este ticket.");
  });

  it("abre stream SSE quando admin está autenticado", async () => {
    mockResolveThreadActor.mockResolvedValue(adminActor);

    const { response, next, controller } = await open("tkt_admin");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const first = await next();
    expect(first).toContain("event: connected");
    controller.abort();
  });

  it("abre stream SSE quando client usa token válido via query param", async () => {
    mockResolveThreadActor.mockResolvedValue(clientActor);

    const { response, next, controller } = await open(
      "tkt_client",
      "tok_valid"
    );

    expect(response.status).toBe(200);
    const first = await next();
    expect(first).toContain("event: connected");

    // Verifica que o token foi passado ao resolver
    expect(mockResolveThreadActor).toHaveBeenCalledWith(
      "tkt_client",
      "tok_valid"
    );
    controller.abort();
  });

  it("entrega eventos no stream autenticado", async () => {
    mockResolveThreadActor.mockResolvedValue(adminActor);

    const { next, controller } = await open("tkt_auth_events");
    await next(); // connected

    threadChannel.publish("tkt_auth_events", {
      type: "new_message",
      timestamp: 42,
    });

    const chunk = await next();
    expect(chunk).toContain("event: new_message");
    expect(chunk).toContain('"ticketId":"tkt_auth_events"');
    controller.abort();
  });

  it("não abre subscriber no emitter quando auth falha", async () => {
    mockResolveThreadActor.mockResolvedValue({
      ok: false,
      status: 401,
      message: "Autenticação necessária.",
    });

    const before = threadChannel.subscriberCount("tkt_nosub");
    await openRaw("tkt_nosub");
    const after = threadChannel.subscriberCount("tkt_nosub");

    expect(after).toBe(before);
  });
});
