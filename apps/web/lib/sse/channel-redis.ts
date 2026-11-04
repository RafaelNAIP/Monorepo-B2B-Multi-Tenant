import { InMemoryChannel } from "./channel-in-memory";
import type { ThreadEventChannel, ThreadEvent, ThreadEventCallback } from "./channel";

/**
 * Subconjunto do cliente Upstash (HTTP) usado pelo canal. Listas em vez de
 * pub/sub: em serverless não há SUBSCRIBE persistente, então cada instância
 * lê os eventos recentes do ticket com polling leve (ver remote-sync.ts).
 */
export interface ChannelRedisClient {
  rpush(key: string, ...values: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<unknown[]>;
}

/** Estado de leitura de uma conexão SSE: o que já foi entregue e desde quando. */
export interface RemoteCursor {
  /** Só entrega eventos com timestamp >= sinceTs (início da conexão). */
  sinceTs: number;
  /** Ids já entregues, para não reentregar (de-dup). */
  seen: Set<string>;
}

export interface RedisChannelOptions {
  /** Identificador desta instância. Evita reentregar o que ela mesma publicou. */
  instanceId?: string;
  /** Tempo de vida da lista do ticket. Eventos antigos não são mais necessários. */
  ttlSeconds?: number;
}

interface StoredRecord {
  id: string;
  origin: string;
  event: ThreadEvent;
}

const DEFAULT_TTL_SECONDS = 90;
const keyFor = (ticketId: string) => `thread-events:${ticketId}`;

/**
 * Canal de eventos com Redis como backbone entre instâncias.
 *
 * - `publish()` entrega localmente de forma síncrona (contrato preservado) e
 *   grava o evento no Redis, fire-and-forget, para as outras instâncias.
 * - `drainRemote()` lê os eventos do ticket no Redis e devolve só os que vieram
 *   de OUTRAS instâncias, novos desde o cursor e ainda não entregues.
 *
 * Sem cliente (fallback local), funciona como InMemoryChannel puro.
 */
export class RedisChannel implements ThreadEventChannel {
  private readonly local = new InMemoryChannel();
  private readonly redis?: ChannelRedisClient;
  private readonly instanceId: string;
  private readonly ttlSeconds: number;

  constructor(redis?: ChannelRedisClient, options: RedisChannelOptions = {}) {
    this.redis = redis;
    this.instanceId = options.instanceId ?? crypto.randomUUID();
    this.ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  }

  subscribe(ticketId: string, callback: ThreadEventCallback): () => void {
    return this.local.subscribe(ticketId, callback);
  }

  publish(ticketId: string, event: Omit<ThreadEvent, "ticketId">): void {
    // Entrega local imediata (mesma instância)
    this.local.publish(ticketId, event);

    const redis = this.redis;
    if (!redis) return;

    const record: StoredRecord = {
      id: crypto.randomUUID(),
      origin: this.instanceId,
      event: { ...event, ticketId },
    };
    const key = keyFor(ticketId);
    void redis
      .rpush(key, JSON.stringify(record))
      .then(() => redis.expire(key, this.ttlSeconds))
      .catch((error) => console.error("[RedisChannel] falha ao publicar evento", error));
  }

  /** Eventos publicados por outras instâncias, novos desde o cursor. */
  async drainRemote(ticketId: string, cursor: RemoteCursor): Promise<ThreadEvent[]> {
    if (!this.redis) return [];

    try {
      const items = await this.redis.lrange(keyFor(ticketId), 0, -1);
      const fresh: ThreadEvent[] = [];

      for (const item of items) {
        const record = parseRecord(item);
        if (!record) continue;
        if (record.origin === this.instanceId) continue;
        if (cursor.seen.has(record.id)) continue;
        if (record.event.timestamp < cursor.sinceTs) continue;

        cursor.seen.add(record.id);
        fresh.push(record.event);
      }
      return fresh;
    } catch (error) {
      console.error("[RedisChannel] falha ao ler eventos remotos", error);
      return [];
    }
  }

  subscriberCount(ticketId: string): number {
    return this.local.subscriberCount(ticketId);
  }
}

/** O Upstash pode devolver a string ou já desserializada (automaticDeserialization). */
function parseRecord(item: unknown): StoredRecord | null {
  try {
    const value = typeof item === "string" ? JSON.parse(item) : item;
    if (
      value &&
      typeof value === "object" &&
      typeof (value as StoredRecord).id === "string" &&
      typeof (value as StoredRecord).origin === "string" &&
      typeof (value as StoredRecord).event?.timestamp === "number"
    ) {
      return value as StoredRecord;
    }
    return null;
  } catch {
    return null;
  }
}
