import { describe, it, expect, afterEach, vi } from "vitest";

import { GET } from "../../app/api/threads/[ticketId]/events/route";
import { HEARTBEAT_INTERVAL_MS } from "../../lib/sse/constants";
import { threadEventEmitter } from "../../lib/sse/thread-event-emitter";

// Usa o emitter real (validado na Fase 1), Request/Response/ReadableStream
// nativos do Node e lê o stream de verdade. Nada do módulo sob teste é mockado.

const decoder = new TextDecoder();

async function open(ticketId: string) {
  const controller = new AbortController();
  const request = new Request(`http://localhost/api/threads/${ticketId}/events`, {
    signal: controller.signal,
  });
  const response = await GET(request, { params: Promise.resolve({ ticketId }) });
  const reader = response.body!.getReader();

  async function next(): Promise<string | null> {
    const { value, done } = await reader.read();
    return done ? null : decoder.decode(value);
  }

  return { response, reader, controller, next };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/threads/[ticketId]/events", () => {
  it("responde 200 com os headers de Server-Sent Events", async () => {
    const { response, controller } = await open("tkt_headers");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toContain("no-cache");
    expect(response.headers.get("Cache-Control")).toContain("no-transform");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");

    controller.abort();
  });

  it("abre o stream com `retry` e um evento `connected`", async () => {
    const { next, controller } = await open("tkt_hello");

    const first = await next();

    expect(first).toContain("retry: ");
    expect(first).toContain("event: connected");
    controller.abort();
  });

  it("repassa eventos emitidos para o ticket no formato SSE", async () => {
    const { next, controller } = await open("tkt_events");
    await next(); // connected

    threadEventEmitter.emit("tkt_events", { type: "new_message", timestamp: 1700 });
    const chunk = await next();

    // Frame SSE válido: linhas "campo: valor" terminadas por linha em branco.
    expect(chunk!.endsWith("\n\n")).toBe(true);
    const fields = Object.fromEntries(
      chunk!
        .trimEnd()
        .split("\n")
        .map((line) => [line.slice(0, line.indexOf(": ")), line.slice(line.indexOf(": ") + 2)])
    );
    expect(fields.id).toBe("1700");
    expect(fields.event).toBe("new_message");
    expect(JSON.parse(fields.data)).toEqual({
      type: "new_message",
      ticketId: "tkt_events",
      timestamp: 1700,
    });
    controller.abort();
  });

  it("repassa cada tipo de evento com o nome correto", async () => {
    const { next, controller } = await open("tkt_types");
    await next();

    for (const type of ["ticket_updated", "thread_disconnected"] as const) {
      threadEventEmitter.emit("tkt_types", { type, timestamp: 1 });
      expect(await next()).toContain(`event: ${type}\n`);
    }
    controller.abort();
  });

  it("não vaza eventos de outros tickets", async () => {
    const { next, controller } = await open("tkt_mine");
    await next();

    threadEventEmitter.emit("tkt_other", { type: "new_message", timestamp: 1 });
    threadEventEmitter.emit("tkt_mine", { type: "ticket_updated", timestamp: 2 });

    const chunk = await next();
    expect(chunk).toContain('"ticketId":"tkt_mine"');
    expect(chunk).not.toContain("tkt_other");
    controller.abort();
  });

  it("envia heartbeat como comentário SSE a cada intervalo", async () => {
    vi.useFakeTimers();
    const { next, controller } = await open("tkt_hb");
    await next();

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS - 1);
    threadEventEmitter.emit("tkt_hb", { type: "new_message", timestamp: 1 });
    expect(await next()).toContain("event: new_message"); // nenhum heartbeat antes da hora

    await vi.advanceTimersByTimeAsync(1);
    expect(await next()).toBe(": keep-alive\n\n");
    controller.abort();
  });

  it("remove o subscriber e encerra o stream quando o cliente aborta", async () => {
    const base = threadEventEmitter.getSubscriberCount("tkt_abort");
    const { next, controller } = await open("tkt_abort");
    await next();
    expect(threadEventEmitter.getSubscriberCount("tkt_abort")).toBe(base + 1);

    controller.abort();

    expect(await next()).toBeNull();
    expect(threadEventEmitter.getSubscriberCount("tkt_abort")).toBe(base);
  });

  it("para o heartbeat depois que a conexão fecha", async () => {
    vi.useFakeTimers();
    const { next, controller } = await open("tkt_hb_stop");
    await next();

    controller.abort();
    await next();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("remove o subscriber quando o consumidor cancela a leitura", async () => {
    const { next, reader } = await open("tkt_cancel");
    await next();
    expect(threadEventEmitter.getSubscriberCount("tkt_cancel")).toBe(1);

    await reader.cancel();

    expect(threadEventEmitter.getSubscriberCount("tkt_cancel")).toBe(0);
  });

  it("não deixa subscriber órfão se o request já chegar abortado", async () => {
    const controller = new AbortController();
    controller.abort();
    const request = new Request("http://localhost/x", { signal: controller.signal });

    const response = await GET(request, {
      params: Promise.resolve({ ticketId: "tkt_preaborted" }),
    });
    const reader = response.body!.getReader();
    await reader.read().catch(() => {});

    expect(threadEventEmitter.getSubscriberCount("tkt_preaborted")).toBe(0);
  });

  it("emitir depois do fechamento não lança erro", async () => {
    const { next, controller } = await open("tkt_after_close");
    await next();
    controller.abort();
    await next();

    expect(() =>
      threadEventEmitter.emit("tkt_after_close", { type: "new_message", timestamp: 1 })
    ).not.toThrow();
  });
});
