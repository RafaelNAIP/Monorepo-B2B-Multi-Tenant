import { InMemoryChannel } from "./channel-in-memory";
import type { ThreadEventChannel } from "./channel";
import type { ThreadEvent, ThreadEventCallback } from "./thread-event-emitter";

/**
 * Canal de eventos com Redis pub/sub.
 *
 * Em produção com múltiplas instâncias (Vercel Fluid Compute), cada instância
 * tem seus próprios subscribers SSE locais. O Redis serve de backbone:
 *
 * - `publish()` envia a mensagem para o Redis E para os subscribers locais.
 * - Uma goroutine de subscrição Redis recebe mensagens de OUTRAS instâncias
 *   e as distribui para os subscribers locais.
 *
 * Enquanto o Redis não estiver configurado (`REDIS_URL` ausente),
 * funciona como InMemoryChannel puro — fallback seguro para dev/preview.
 */
export class RedisChannel implements ThreadEventChannel {
  private local = new InMemoryChannel();
  private redisUrl: string | undefined;

  constructor(redisUrl?: string) {
    this.redisUrl = redisUrl;

    if (this.redisUrl) {
      // TODO: Conectar ao Redis pub/sub aqui.
      // - Criar publisher e subscriber clients (ioredis).
      // - subscriber.subscribe("thread-events").
      // - Ao receber mensagem do Redis, fazer this.local.publish() para
      //   distribuir aos SSE connections locais.
      console.info("[RedisChannel] Redis URL detectada, mas conexão ainda não implementada. Usando fallback local.");
    }
  }

  subscribe(ticketId: string, callback: ThreadEventCallback): () => void {
    return this.local.subscribe(ticketId, callback);
  }

  publish(ticketId: string, event: Omit<ThreadEvent, "ticketId">): void {
    // Entrega local imediata (mesma instância)
    this.local.publish(ticketId, event);

    // TODO: Publicar no Redis para outras instâncias
    // if (this.publisher) {
    //   this.publisher.publish("thread-events", JSON.stringify({ ticketId, ...event }));
    // }
  }

  subscriberCount(ticketId: string): number {
    return this.local.subscriberCount(ticketId);
  }
}
