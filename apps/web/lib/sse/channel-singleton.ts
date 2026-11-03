import type { ThreadEventChannel } from "./channel";
import type { ThreadEventType } from "./thread-event-emitter";
import { InMemoryChannel } from "./channel-in-memory";
import { RedisChannel } from "./channel-redis";

// ─── Singleton ─────────────────────────────────────────────────

const GLOBAL_KEY = Symbol.for("empresa.threadEventChannel");
const globalStore = globalThis as unknown as Record<
  symbol,
  ThreadEventChannel | undefined
>;

function createChannel(): ThreadEventChannel {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return new RedisChannel(redisUrl);
  }
  return new InMemoryChannel();
}

/** Canal de eventos de thread (singleton via globalThis). */
export const threadChannel: ThreadEventChannel =
  globalStore[GLOBAL_KEY] ?? (globalStore[GLOBAL_KEY] = createChannel());

/** Atalho: publica um evento de thread. Chamar SEMPRE depois de persistir. */
export function notifyThread(ticketId: string, type: ThreadEventType): void {
  threadChannel.publish(ticketId, { type, timestamp: Date.now() });
}
