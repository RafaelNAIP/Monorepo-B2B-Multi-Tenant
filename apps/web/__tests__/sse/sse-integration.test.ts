import { describe, it, expect, afterEach, vi } from "vitest";

import { createThreadSync, type ThreadSync } from "../../lib/sse/thread-sync";
import { threadEventEmitter } from "../../lib/sse/thread-event-emitter";
import { RouteEventSource } from "./helpers/route-event-source";

/**
 * Integração ponta a ponta do canal em tempo real, sem mocks do nosso código:
 *
 *   "action" ──emit──▶ threadEventEmitter ──▶ route handler (GET real)
 *        ▲                                          │ stream SSE real
 *        │                                          ▼
 *   banco em memória ◀── fetchSnapshot ◀── createThreadSync (real) ◀── parser SSE
 *
 * A única parte simulada é o banco (um array em memória).
 */

type Msg = { id: number; ticketId: string; content: string };

function makeDb() {
  const rows: Msg[] = [];
  return {
    rows,
    /** Equivale ao que sendMessageAction fará: persiste e emite. */
    send(ticketId: string, content: string) {
      rows.push({ id: rows.length + 1, ticketId, content });
      threadEventEmitter.emit(ticketId, { type: "new_message", timestamp: Date.now() });
    },
    snapshotFor: (ticketId: string) => async () =>
      rows.filter((r) => r.ticketId === ticketId).map((r) => r.content),
  };
}

const running: ThreadSync[] = [];
function connect(ticketId: string, fetchSnapshot: () => Promise<string[]>) {
  const seen: string[][] = [];
  const sync = createThreadSync<string[]>({
    ticketId,
    fetchSnapshot,
    onSnapshot: (s) => seen.push(s),
    createEventSource: (url) => new RouteEventSource(url) as unknown as EventSource,
  });
  sync.start();
  running.push(sync);
  return { sync, seen, latest: () => seen[seen.length - 1] };
}

afterEach(() => {
  while (running.length) running.pop()!.stop();
});

describe("canal em tempo real (emitter + route + controlador)", () => {
  it("mensagem enviada aparece para quem está conectado, sem polling", async () => {
    const db = makeDb();
    const client = connect("tkt_e2e_1", db.snapshotFor("tkt_e2e_1"));
    await vi.waitFor(() => expect(client.seen).toHaveLength(1)); // catch-up ao abrir
    expect(client.latest()).toEqual([]);

    db.send("tkt_e2e_1", "Olá, preciso de ajuda");
    await vi.waitFor(() =>
      expect(client.latest()).toEqual(["Olá, preciso de ajuda"])
    );

    db.send("tkt_e2e_1", "Claro, como posso ajudar?");
    await vi.waitFor(() =>
      expect(client.latest()).toEqual([
        "Olá, preciso de ajuda",
        "Claro, como posso ajudar?",
      ])
    );
    expect(client.sync.getMode()).toBe("sse");
  });

  it("admin e cliente da mesma thread recebem; outra thread não é afetada", async () => {
    const db = makeDb();
    const admin = connect("tkt_e2e_2", db.snapshotFor("tkt_e2e_2"));
    const client = connect("tkt_e2e_2", db.snapshotFor("tkt_e2e_2"));
    const stranger = connect("tkt_e2e_other", db.snapshotFor("tkt_e2e_other"));
    await vi.waitFor(() => {
      expect(admin.seen).toHaveLength(1);
      expect(client.seen).toHaveLength(1);
      expect(stranger.seen).toHaveLength(1);
    });

    db.send("tkt_e2e_2", "mensagem do atendente");

    await vi.waitFor(() => {
      expect(admin.latest()).toEqual(["mensagem do atendente"]);
      expect(client.latest()).toEqual(["mensagem do atendente"]);
    });
    // dar tempo para um possível vazamento chegar
    await new Promise((r) => setTimeout(r, 30));
    expect(stranger.seen).toHaveLength(1);
    expect(stranger.latest()).toEqual([]);
  });

  it("rajada de mensagens termina com o estado completo", async () => {
    const db = makeDb();
    const client = connect("tkt_e2e_3", db.snapshotFor("tkt_e2e_3"));
    await vi.waitFor(() => expect(client.seen).toHaveLength(1));

    for (let i = 1; i <= 10; i++) db.send("tkt_e2e_3", `m${i}`);

    await vi.waitFor(() => expect(client.latest()).toHaveLength(10));
    expect(client.latest()![9]).toBe("m10");
  });

  it("stop() libera a conexão no servidor (sem subscriber vazando)", async () => {
    const db = makeDb();
    const before = threadEventEmitter.getSubscriberCount("tkt_e2e_4");
    const client = connect("tkt_e2e_4", db.snapshotFor("tkt_e2e_4"));
    await vi.waitFor(() =>
      expect(threadEventEmitter.getSubscriberCount("tkt_e2e_4")).toBe(before + 1)
    );

    client.sync.stop();

    await vi.waitFor(() =>
      expect(threadEventEmitter.getSubscriberCount("tkt_e2e_4")).toBe(before)
    );
  });

  it("eventos thread_disconnected e ticket_updated também chegam", async () => {
    let version = 0;
    const seen: number[] = [];
    const sync = createThreadSync<number>({
      ticketId: "tkt_e2e_5",
      fetchSnapshot: async () => ++version,
      onSnapshot: (v) => seen.push(v),
      createEventSource: (url) => new RouteEventSource(url) as unknown as EventSource,
    });
    sync.start();
    running.push(sync);
    await vi.waitFor(() => expect(seen).toHaveLength(1));

    threadEventEmitter.emit("tkt_e2e_5", { type: "ticket_updated", timestamp: 1 });
    await vi.waitFor(() => expect(seen).toHaveLength(2));
    threadEventEmitter.emit("tkt_e2e_5", { type: "thread_disconnected", timestamp: 2 });
    await vi.waitFor(() => expect(seen).toHaveLength(3));
  });

  it("heartbeat do servidor é ignorado pelo cliente (não gera atualização)", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      let fetches = 0;
      const sources: RouteEventSource[] = [];
      const sync = createThreadSync<number>({
        ticketId: "tkt_e2e_6",
        fetchSnapshot: async () => ++fetches,
        onSnapshot: () => {},
        createEventSource: (url) => {
          const es = new RouteEventSource(url);
          sources.push(es);
          return es as unknown as EventSource;
        },
      });
      sync.start();
      running.push(sync);
      await vi.waitFor(() => expect(fetches).toBe(1));

      await vi.advanceTimersByTimeAsync(30_000);
      await vi.waitFor(() => expect(sources[0].comments).toBe(1));

      expect(fetches).toBe(1); // heartbeat não é evento
    } finally {
      vi.useRealTimers();
    }
  });
});
