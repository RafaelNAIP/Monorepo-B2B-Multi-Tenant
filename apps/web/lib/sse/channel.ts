import type { ThreadEvent, ThreadEventCallback, ThreadEventType } from "./thread-event-emitter";
import { THREAD_EVENT_TYPES } from "./thread-event-emitter";

/**
 * Contrato do canal de eventos de thread.
 *
 * Abstrai o mecanismo de pub/sub para que o route handler e os producers
 * (server actions) não dependam de um backend específico.
 *
 * Implementações:
 * - InMemoryChannel  → um único processo (dev, preview, instância única)
 * - RedisChannel     → múltiplas instâncias (produção com Fluid Compute)
 */
export interface ThreadEventChannel {
  /** Inscreve um callback para eventos do ticket. Retorna unsubscribe. */
  subscribe(ticketId: string, callback: ThreadEventCallback): () => void;

  /** Publica um evento para todos os inscritos daquele ticket. */
  publish(ticketId: string, event: Omit<ThreadEvent, "ticketId">): void;

  /** Número de inscritos locais naquele ticket (para testes e métricas). */
  subscriberCount(ticketId: string): number;
}

export { THREAD_EVENT_TYPES };
export type { ThreadEvent, ThreadEventCallback, ThreadEventType };
