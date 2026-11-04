import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { RedisChannel, type ChannelRedisClient } from "../../lib/sse/channel-redis";
import { startRemoteSync } from "../../lib/sse/remote-sync";
import type { ThreadEvent } from "../../lib/sse/channel";

// ─── Fake de Redis (listas) — dois "processos" compartilham o mesmo store ──

function createFakeRedis() {
  const lists = new Map<string, string[]>();
  const ttls = new Map<string, number>();

  const client: ChannelRedisClient = {
    async rpush(key, ...values) {
      const list = lists.get(key) ?? [];
      list.push(...values);
      lists.set(key, list);
      return list.length;
    },
    async expire(key, seconds) {
      ttls.set(key, seconds);
      return 1;
    },
    async lrange(key, start, stop) {
      const list = lists.get(key) ?? [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    },
  };

  return { client, lists, ttls };
}

/** Deixa as promessas fire-and-forget do publish terminarem. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const ticket = "tkt_fanout_1";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RedisChannel — publish local continua síncrono", () => {
  it("entrega localmente na hora, mesmo com Redis configurado", async () => {
    const { client } = createFakeRedis();
    const ch = new RedisChannel(client, { instanceId: "inst-a" });
    const spy = vi.fn();

    ch.subscribe(ticket, spy);
    ch.publish(ticket, { type: "new_message", timestamp: 1 });

    // Sem await: a entrega local é síncrona (contrato preservado)
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("RedisChannel — publish grava no Redis para outras instâncias", () => {
  it("empilha o evento na lista do ticket com origem e id", async () => {
    const { client, lists, ttls } = createFakeRedis();
    const ch = new RedisChannel(client, { instanceId: "inst-a" });

    ch.publish(ticket, { type: "ticket_updated", timestamp: 42 });
    await flush();

    const raw = lists.get(`thread-events:${ticket}`) ?? [];
    expect(raw).toHaveLength(1);
    const record = JSON.parse(raw[0]);
    expect(record.origin).toBe("inst-a");
    expect(typeof record.id).toBe("string");
    expect(record.event).toEqual({ type: "ticket_updated", ticketId: ticket, timestamp: 42 });
    expect(ttls.get(`thread-events:${ticket}`)).toBeGreaterThan(0);
  });

  it("erro do Redis no publish não lança e não impede a entrega local", async () => {
    const broken: ChannelRedisClient = {
      rpush: async () => {
        throw new Error("upstash fora");
      },
      expire: async () => 0,
      lrange: async () => [],
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ch = new RedisChannel(broken, { instanceId: "inst-a" });
    const spy = vi.fn();

    ch.subscribe(ticket, spy);
    expect(() => ch.publish(ticket, { type: "new_message", timestamp: 1 })).not.toThrow();
    await flush();

    expect(spy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("RedisChannel.drainRemote — recebe eventos de outras instâncias", () => {
  it("entrega ao cursor de outra instância um evento publicado remotamente", async () => {
    const { client } = createFakeRedis();
    const instanceA = new RedisChannel(client, { instanceId: "inst-a" });
    const instanceB = new RedisChannel(client, { instanceId: "inst-b" });

    const cursor = { sinceTs: 0, seen: new Set<string>() };
    instanceA.publish(ticket, { type: "new_message", timestamp: 100 });
    await flush();

    const events = await instanceB.drainRemote(ticket, cursor);

    expect(events).toEqual([{ type: "new_message", ticketId: ticket, timestamp: 100 }]);
  });

  it("ignora eventos publicados pela própria instância (já entregues localmente)", async () => {
    const { client } = createFakeRedis();
    const ch = new RedisChannel(client, { instanceId: "inst-a" });

    ch.publish(ticket, { type: "new_message", timestamp: 100 });
    await flush();

    const events = await ch.drainRemote(ticket, { sinceTs: 0, seen: new Set() });
    expect(events).toEqual([]);
  });

  it("não reentrega o mesmo evento duas vezes (de-dup por id)", async () => {
    const { client } = createFakeRedis();
    const a = new RedisChannel(client, { instanceId: "inst-a" });
    const b = new RedisChannel(client, { instanceId: "inst-b" });

    a.publish(ticket, { type: "new_message", timestamp: 100 });
    await flush();

    const cursor = { sinceTs: 0, seen: new Set<string>() };
    expect(await b.drainRemote(ticket, cursor)).toHaveLength(1);
    expect(await b.drainRemote(ticket, cursor)).toHaveLength(0);
  });

  it("ignora eventos anteriores ao início da conexão (sinceTs)", async () => {
    const { client } = createFakeRedis();
    const a = new RedisChannel(client, { instanceId: "inst-a" });
    const b = new RedisChannel(client, { instanceId: "inst-b" });

    a.publish(ticket, { type: "new_message", timestamp: 50 }); // antes da conexão
    a.publish(ticket, { type: "ticket_updated", timestamp: 200 }); // depois
    await flush();

    const events = await b.drainRemote(ticket, { sinceTs: 100, seen: new Set() });
    expect(events.map((e: ThreadEvent) => e.timestamp)).toEqual([200]);
  });

  it("isola tickets: não entrega evento de outro ticket", async () => {
    const { client } = createFakeRedis();
    const a = new RedisChannel(client, { instanceId: "inst-a" });
    const b = new RedisChannel(client, { instanceId: "inst-b" });

    a.publish("tkt_outro", { type: "new_message", timestamp: 100 });
    await flush();

    expect(await b.drainRemote(ticket, { sinceTs: 0, seen: new Set() })).toEqual([]);
  });

  it("sem cliente Redis (fallback local) retorna lista vazia", async () => {
    const ch = new RedisChannel();
    expect(await ch.drainRemote(ticket, { sinceTs: 0, seen: new Set() })).toEqual([]);
  });

  it("erro na leitura retorna lista vazia sem lançar", async () => {
    const broken: ChannelRedisClient = {
      rpush: async () => 0,
      expire: async () => 0,
      lrange: async () => {
        throw new Error("timeout");
      },
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ch = new RedisChannel(broken, { instanceId: "inst-b" });

    await expect(ch.drainRemote(ticket, { sinceTs: 0, seen: new Set() })).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("startRemoteSync — polling periódico da route SSE", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("emite eventos remotos a cada intervalo", async () => {
    const { client } = createFakeRedis();
    const a = new RedisChannel(client, { instanceId: "inst-a" });
    const b = new RedisChannel(client, { instanceId: "inst-b" });
    const onEvent = vi.fn();

    const stop = startRemoteSync(b, ticket, onEvent, { intervalMs: 1000, sinceTs: 0 });

    a.publish(ticket, { type: "new_message", timestamp: 500 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(onEvent).toHaveBeenCalledWith({
      type: "new_message",
      ticketId: ticket,
      timestamp: 500,
    });
    stop();
  });

  it("não faz nada quando o canal não é remoto (InMemory)", async () => {
    const onEvent = vi.fn();
    const { InMemoryChannel } = await import("../../lib/sse/channel-in-memory");

    const stop = startRemoteSync(new InMemoryChannel(), ticket, onEvent, {
      intervalMs: 1000,
      sinceTs: 0,
    });
    await vi.advanceTimersByTimeAsync(5000);

    expect(onEvent).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });

  it("stop() interrompe o polling (não vaza timer após o fim da conexão)", async () => {
    const { client } = createFakeRedis();
    const b = new RedisChannel(client, { instanceId: "inst-b" });
    const stop = startRemoteSync(b, ticket, vi.fn(), { intervalMs: 1000, sinceTs: 0 });

    stop();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("não sobrepõe leituras: se uma ainda está em voo, o tick seguinte é pulado", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const slow: ChannelRedisClient = {
      rpush: async () => 0,
      expire: async () => 0,
      lrange: async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 2500));
        inFlight--;
        return [];
      },
    };
    const b = new RedisChannel(slow, { instanceId: "inst-b" });
    const stop = startRemoteSync(b, ticket, vi.fn(), { intervalMs: 1000, sinceTs: 0 });

    await vi.advanceTimersByTimeAsync(5000);
    stop();
    await vi.runOnlyPendingTimersAsync();

    expect(maxInFlight).toBe(1);
  });
});
