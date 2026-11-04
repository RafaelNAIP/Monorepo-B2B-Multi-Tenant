// ─── Tipos canônicos de eventos de thread ───────────────────────

export const THREAD_EVENT_TYPES = [
  "new_message",
  "ticket_updated",
  "thread_disconnected",
] as const;

export type ThreadEventType = (typeof THREAD_EVENT_TYPES)[number];

export interface ThreadEvent {
  type: ThreadEventType;
  ticketId: string;
  timestamp: number;
}

export type ThreadEventCallback = (event: ThreadEvent) => void;

// ─── Contrato do canal ──────────────────────────────────────────

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
