import { describe, it, expect, vi } from "vitest";

import {
  ThreadEventEmitter,
  type ThreadEvent,
} from "../../lib/sse/thread-event-emitter";

// Classe pura, sem dependências externas: nenhum mock neste arquivo.

function collect(emitter: ThreadEventEmitter, ticketId: string) {
  const received: ThreadEvent[] = [];
  const unsubscribe = emitter.subscribe(ticketId, (e) => received.push(e));
  return { received, unsubscribe };
}

describe("ThreadEventEmitter", () => {
  it("entrega o evento completo (com ticketId) ao subscriber do ticket", () => {
    const emitter = new ThreadEventEmitter();
    const { received } = collect(emitter, "tkt_1");

    emitter.emit("tkt_1", { type: "new_message", timestamp: 123 });

    expect(received).toEqual([
      { type: "new_message", ticketId: "tkt_1", timestamp: 123 },
    ]);
  });

  it("não entrega eventos de outros tickets (isolamento entre threads)", () => {
    const emitter = new ThreadEventEmitter();
    const a = collect(emitter, "tkt_a");
    const b = collect(emitter, "tkt_b");

    emitter.emit("tkt_a", { type: "new_message", timestamp: 1 });

    expect(a.received).toHaveLength(1);
    expect(b.received).toHaveLength(0);
  });

  it("entrega a todos os subscribers do mesmo ticket (admin + cliente)", () => {
    const emitter = new ThreadEventEmitter();
    const admin = collect(emitter, "tkt_1");
    const client = collect(emitter, "tkt_1");

    emitter.emit("tkt_1", { type: "ticket_updated", timestamp: 1 });

    expect(admin.received).toHaveLength(1);
    expect(client.received).toHaveLength(1);
  });

  it("para de entregar após unsubscribe, sem afetar os demais", () => {
    const emitter = new ThreadEventEmitter();
    const first = collect(emitter, "tkt_1");
    const second = collect(emitter, "tkt_1");

    first.unsubscribe();
    emitter.emit("tkt_1", { type: "new_message", timestamp: 1 });

    expect(first.received).toHaveLength(0);
    expect(second.received).toHaveLength(1);
  });

  it("unsubscribe é idempotente", () => {
    const emitter = new ThreadEventEmitter();
    const { unsubscribe } = collect(emitter, "tkt_1");
    const other = collect(emitter, "tkt_1");

    unsubscribe();
    unsubscribe();

    expect(emitter.getSubscriberCount("tkt_1")).toBe(1);
    other.unsubscribe();
    expect(emitter.getSubscriberCount("tkt_1")).toBe(0);
  });

  it("getSubscriberCount acompanha subscribe/unsubscribe", () => {
    const emitter = new ThreadEventEmitter();
    expect(emitter.getSubscriberCount("tkt_1")).toBe(0);

    const a = collect(emitter, "tkt_1");
    const b = collect(emitter, "tkt_1");
    collect(emitter, "tkt_2");

    expect(emitter.getSubscriberCount("tkt_1")).toBe(2);
    expect(emitter.getSubscriberCount("tkt_2")).toBe(1);

    a.unsubscribe();
    expect(emitter.getSubscriberCount("tkt_1")).toBe(1);
    b.unsubscribe();
    expect(emitter.getSubscriberCount("tkt_1")).toBe(0);
  });

  it("emit sem subscribers não lança", () => {
    const emitter = new ThreadEventEmitter();
    expect(() =>
      emitter.emit("ninguem", { type: "new_message", timestamp: 1 })
    ).not.toThrow();
  });

  it("subscriber que lança exceção não impede os demais de receber", () => {
    const emitter = new ThreadEventEmitter();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    emitter.subscribe("tkt_1", () => {
      throw new Error("callback quebrado");
    });
    const healthy = collect(emitter, "tkt_1");

    expect(() =>
      emitter.emit("tkt_1", { type: "new_message", timestamp: 1 })
    ).not.toThrow();

    expect(healthy.received).toHaveLength(1);
    errorSpy.mockRestore();
  });

  it("subscriber inscrito durante o emit não recebe o evento em andamento", () => {
    // Cenário real: uma nova aba/conexão SSE abre no mesmo instante em que
    // uma mensagem é emitida. Sem snapshot, o recém-chegado receberia um
    // evento anterior à sua inscrição (e um callback que se reinscreve
    // causaria loop infinito).
    const emitter = new ThreadEventEmitter();
    const late: ThreadEvent[] = [];
    let subscribedLate = false;

    emitter.subscribe("tkt_1", () => {
      if (subscribedLate) return;
      subscribedLate = true;
      emitter.subscribe("tkt_1", (e) => late.push(e));
    });

    emitter.emit("tkt_1", { type: "new_message", timestamp: 1 });
    expect(late).toHaveLength(0);

    emitter.emit("tkt_1", { type: "new_message", timestamp: 2 });
    expect(late).toHaveLength(1);
  });

  it("o mesmo callback inscrito duas vezes recebe duas entregas e se desinscreve de forma independente", () => {
    const emitter = new ThreadEventEmitter();
    const cb = vi.fn();
    const unsub1 = emitter.subscribe("tkt_1", cb);
    emitter.subscribe("tkt_1", cb);

    emitter.emit("tkt_1", { type: "new_message", timestamp: 1 });
    expect(cb).toHaveBeenCalledTimes(2);

    unsub1();
    emitter.emit("tkt_1", { type: "new_message", timestamp: 2 });
    expect(cb).toHaveBeenCalledTimes(3);
  });
});

describe("threadEventEmitter (singleton compartilhado)", () => {
  it("é a mesma instância mesmo quando o módulo é carregado duas vezes", async () => {
    // Em Next.js, route handlers e server actions podem ser empacotados
    // em instâncias separadas do mesmo módulo. O singleton precisa
    // sobreviver a isso, senão o SSE nunca recebe os eventos das actions.
    vi.resetModules();
    const first = await import("../../lib/sse/thread-event-emitter");
    vi.resetModules();
    const second = await import("../../lib/sse/thread-event-emitter");

    expect(first).not.toBe(second); // módulos realmente distintos
    expect(first.threadEventEmitter).toBe(second.threadEventEmitter);

    const received: ThreadEvent[] = [];
    first.threadEventEmitter.subscribe("tkt_x", (e) => received.push(e));
    second.threadEventEmitter.emit("tkt_x", {
      type: "new_message",
      timestamp: 1,
    });
    expect(received).toHaveLength(1);
  });
});
