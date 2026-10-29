import { setImmediate as realSetImmediate } from "node:timers";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createThreadSync } from "../../lib/sse/thread-sync";
import {
  FALLBACK_POLL_INTERVAL_MS,
  MAX_SSE_ERRORS,
  SSE_REOPEN_DELAY_MS,
} from "../../lib/sse/constants";
import { THREAD_EVENT_TYPES } from "../../lib/sse/thread-event-emitter";
import { FakeEventSource } from "./helpers/fake-event-source";

/**
 * O controlador é lógica pura. A única fronteira substituída é o EventSource
 * do navegador (FakeEventSource) e a fonte de dados (`fetchSnapshot`), que aqui
 * é uma fila de promessas controlada pelo teste para provar ordenação,
 * coalescência e descarte de respostas atrasadas.
 */

function makeDataSource() {
  const calls: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];
  return {
    calls,
    fetchSnapshot: () =>
      new Promise<string>((resolve, reject) => calls.push({ resolve, reject })),
  };
}

/** Fonte que responde na hora com `snapshot-N`. */
function makeAutoSource() {
  let n = 0;
  return {
    get count() {
      return n;
    },
    fetchSnapshot: async () => `snapshot-${++n}`,
  };
}

function setup(source: { fetchSnapshot: () => Promise<string> }) {
  const snapshots: string[] = [];
  const sync = createThreadSync<string>({
    ticketId: "tkt_1",
    fetchSnapshot: source.fetchSnapshot,
    onSnapshot: (s) => snapshots.push(s),
    createEventSource: (url) => new FakeEventSource(url) as unknown as EventSource,
  });
  return { sync, snapshots };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  FakeEventSource.reset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("createThreadSync — modo SSE", () => {
  it("abre o EventSource na URL do ticket", () => {
    const { sync } = setup(makeAutoSource());
    sync.start();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.last.url).toBe("/api/threads/tkt_1/events");
    expect(sync.getMode()).toBe("sse");
  });

  it("não busca dados antes da conexão abrir (o servidor já entregou o estado inicial)", async () => {
    const source = makeAutoSource();
    const { sync, snapshots } = setup(source);
    sync.start();
    await flush();

    expect(source.count).toBe(0);
    expect(snapshots).toEqual([]);
  });

  it("ao abrir a conexão busca o estado para recuperar o que foi perdido", async () => {
    const { sync, snapshots } = setup(makeAutoSource());
    sync.start();
    FakeEventSource.last.open();
    await flush();

    expect(snapshots).toEqual(["snapshot-1"]);
  });

  it.each(THREAD_EVENT_TYPES)("evento %s dispara atualização e entrega o snapshot", async (type) => {
    const { sync, snapshots } = setup(makeAutoSource());
    sync.start();
    FakeEventSource.last.open();
    await flush();

    FakeEventSource.last.emit(type, { ticketId: "tkt_1" });
    await flush();

    expect(snapshots).toEqual(["snapshot-1", "snapshot-2"]);
  });

  it("evento chegando durante um fetch em andamento gera UM fetch extra, e o estado final é o do último", async () => {
    const source = makeDataSource();
    const { sync, snapshots } = setup(source);
    sync.start();
    const es = FakeEventSource.last;
    es.open(); // fetch #1 em voo
    await flush();
    expect(source.calls).toHaveLength(1);

    // rajada de 3 mensagens enquanto #1 não respondeu
    es.emit("new_message");
    es.emit("new_message");
    es.emit("new_message");
    await flush();
    expect(source.calls).toHaveLength(1); // nenhum fetch concorrente

    source.calls[0].resolve("estado-antigo");
    await flush();
    expect(source.calls).toHaveLength(2); // exatamente um de acompanhamento

    source.calls[1].resolve("estado-mais-novo");
    await flush();

    expect(snapshots).toEqual(["estado-antigo", "estado-mais-novo"]);
    expect(source.calls).toHaveLength(2);
  });

  it("falha no fetch é engolida e o próximo evento atualiza normalmente", async () => {
    const source = makeDataSource();
    const { sync, snapshots } = setup(source);
    sync.start();
    const es = FakeEventSource.last;
    es.open();
    await flush();

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);

    source.calls[0].reject(new Error("rede caiu"));
    await flush();
    await new Promise<void>((r) => realSetImmediate(r)); // deixa o Node reportar rejeições pendentes
    process.off("unhandledRejection", onUnhandled);

    expect(unhandled).toEqual([]);
    expect(snapshots).toEqual([]);

    es.emit("new_message");
    await flush();
    source.calls[1].resolve("recuperado");
    await flush();

    expect(snapshots).toEqual(["recuperado"]);
  });

  it("stop() descarta resposta que chega depois", async () => {
    const source = makeDataSource();
    const { sync, snapshots } = setup(source);
    sync.start();
    FakeEventSource.last.open();
    await flush();

    sync.stop();
    source.calls[0].resolve("tarde demais");
    await flush();

    expect(snapshots).toEqual([]);
  });

  it("stop() fecha o EventSource, ignora eventos posteriores e não deixa timers", async () => {
    const source = makeAutoSource();
    const { sync, snapshots } = setup(source);
    sync.start();
    const es = FakeEventSource.last;
    es.open();
    await flush();

    sync.stop();
    es.emit("new_message");
    await flush();

    expect(es.closed).toBe(true);
    expect(snapshots).toEqual(["snapshot-1"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("start() é idempotente (não abre duas conexões)", () => {
    const { sync } = setup(makeAutoSource());
    sync.start();
    sync.start();
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});

describe("createThreadSync — fallback para polling", () => {
  it(`permanece em SSE com menos de ${MAX_SSE_ERRORS} erros seguidos`, async () => {
    const source = makeAutoSource();
    const { sync } = setup(source);
    sync.start();
    const es = FakeEventSource.last;

    es.fail();
    es.fail();
    await vi.advanceTimersByTimeAsync(FALLBACK_POLL_INTERVAL_MS * 3);

    expect(sync.getMode()).toBe("sse");
    expect(source.count).toBe(0);
  });

  it(`cai para polling após ${MAX_SSE_ERRORS} erros consecutivos, a cada ${FALLBACK_POLL_INTERVAL_MS}ms (não 3000)`, async () => {
    const source = makeAutoSource();
    const { sync, snapshots } = setup(source);
    sync.start();
    const es = FakeEventSource.last;

    for (let i = 0; i < MAX_SSE_ERRORS; i++) es.fail();
    expect(sync.getMode()).toBe("polling");

    await vi.advanceTimersByTimeAsync(FALLBACK_POLL_INTERVAL_MS - 1);
    expect(snapshots).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(snapshots).toEqual(["snapshot-1"]);

    await vi.advanceTimersByTimeAsync(FALLBACK_POLL_INTERVAL_MS);
    expect(snapshots).toEqual(["snapshot-1", "snapshot-2"]);
  });

  it("uma abertura bem-sucedida zera a contagem de erros", async () => {
    const { sync } = setup(makeAutoSource());
    sync.start();
    const es = FakeEventSource.last;

    es.fail();
    es.fail();
    es.open();
    es.fail();
    es.fail();

    expect(sync.getMode()).toBe("sse");
  });

  it("quando o SSE volta, para o polling e retorna ao modo SSE (com fetch de recuperação)", async () => {
    const source = makeAutoSource();
    const { sync, snapshots } = setup(source);
    sync.start();
    const es = FakeEventSource.last;
    for (let i = 0; i < MAX_SSE_ERRORS; i++) es.fail();
    await vi.advanceTimersByTimeAsync(FALLBACK_POLL_INTERVAL_MS);
    expect(snapshots).toEqual(["snapshot-1"]);

    es.open(); // o navegador reconectou sozinho
    await flush();

    expect(sync.getMode()).toBe("sse");
    expect(snapshots).toEqual(["snapshot-1", "snapshot-2"]); // catch-up

    await vi.advanceTimersByTimeAsync(FALLBACK_POLL_INTERVAL_MS * 4);
    expect(snapshots).toHaveLength(2); // polling parou
  });

  it("eventos SSE continuam atualizando enquanto está em polling (conexão voltou entre ticks)", async () => {
    const { sync, snapshots } = setup(makeAutoSource());
    sync.start();
    const es = FakeEventSource.last;
    for (let i = 0; i < MAX_SSE_ERRORS; i++) es.fail();

    es.emit("new_message");
    await flush();

    expect(snapshots).toEqual(["snapshot-1"]);
  });

  it("se o navegador desiste do EventSource (CLOSED), reabre uma nova conexão depois do atraso", async () => {
    const { sync } = setup(makeAutoSource());
    sync.start();
    expect(FakeEventSource.instances).toHaveLength(1);

    FakeEventSource.last.fail(true); // CLOSED permanente
    expect(FakeEventSource.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(SSE_REOPEN_DELAY_MS - 1);
    expect(FakeEventSource.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.last.url).toBe("/api/threads/tkt_1/events");
    expect(FakeEventSource.instances[0].closed).toBe(true);

    // a nova conexão funciona normalmente
    FakeEventSource.last.open();
    await flush();
    expect(sync.getMode()).toBe("sse");
  });

  it("CLOSED permanente repetido mantém polling ativo enquanto tenta reabrir", async () => {
    const source = makeAutoSource();
    const { sync, snapshots } = setup(source);
    sync.start();

    for (let i = 0; i < MAX_SSE_ERRORS; i++) {
      FakeEventSource.last.fail(true);
      await vi.advanceTimersByTimeAsync(SSE_REOPEN_DELAY_MS);
    }

    expect(sync.getMode()).toBe("polling");
    const before = snapshots.length;
    await vi.advanceTimersByTimeAsync(FALLBACK_POLL_INTERVAL_MS);
    expect(snapshots.length).toBeGreaterThan(before);
  });

  it("stop() em modo polling cancela intervalo e reabertura pendente", async () => {
    const source = makeAutoSource();
    const { sync, snapshots } = setup(source);
    sync.start();
    for (let i = 0; i < MAX_SSE_ERRORS - 1; i++) FakeEventSource.last.fail();
    FakeEventSource.last.fail(true); // 3º erro, permanente: polling + reabertura agendada
    expect(sync.getMode()).toBe("polling");

    sync.stop();
    await vi.advanceTimersByTimeAsync(SSE_REOPEN_DELAY_MS * 2);

    expect(vi.getTimerCount()).toBe(0);
    expect(snapshots).toEqual([]);
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
