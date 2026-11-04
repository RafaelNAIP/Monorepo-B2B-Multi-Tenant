import type { ThreadEventChannel, ThreadEventType } from "./channel";
import { InMemoryChannel } from "./channel-in-memory";
import { RedisChannel, type ChannelRedisClient } from "./channel-redis";
import { getRedis, isRedisConfigured } from "@empresa/auth/redis";

// ─── Singleton ─────────────────────────────────────────────────

const GLOBAL_KEY = Symbol.for("empresa.threadEventChannel");
const globalStore = globalThis as unknown as Record<
  symbol,
  ThreadEventChannel | undefined
>;

function createChannel(): ThreadEventChannel {
  if (isRedisConfigured()) {
    return new RedisChannel(getRedis() as unknown as ChannelRedisClient);
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
