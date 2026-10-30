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

/**
 * Pub/sub em memória, particionado por ticketId.
 *
 * Funciona para uma única instância do servidor. Para múltiplas instâncias,
 * trocar a implementação por Redis pub/sub mantendo esta mesma interface.
 */
export class ThreadEventEmitter {
  private listeners = new Map<string, Set<ThreadEventCallback>>();

  subscribe(ticketId: string, callback: ThreadEventCallback): () => void {
    // Wrapper único por inscrição: permite o mesmo callback ser inscrito
    // mais de uma vez e se desinscrever de forma independente.
    const entry: ThreadEventCallback = (event) => callback(event);

    let set = this.listeners.get(ticketId);
    if (!set) {
      set = new Set();
      this.listeners.set(ticketId, set);
    }
    set.add(entry);

    return () => {
      const current = this.listeners.get(ticketId);
      if (!current) return;
      current.delete(entry);
      if (current.size === 0) this.listeners.delete(ticketId);
    };
  }

  emit(ticketId: string, event: Omit<ThreadEvent, "ticketId">): void {
    const set = this.listeners.get(ticketId);
    if (!set) return;

    const fullEvent: ThreadEvent = { ...event, ticketId };
    // Snapshot: unsubscribe durante o emit não pode pular ninguém.
    for (const listener of [...set]) {
      try {
        listener(fullEvent);
      } catch (error) {
        console.error("[thread-event-emitter] subscriber falhou", error);
      }
    }
  }

  getSubscriberCount(ticketId: string): number {
    return this.listeners.get(ticketId)?.size ?? 0;
  }
}

// Route handlers e server actions podem ser empacotados em instâncias
// separadas deste módulo (e o dev server recarrega módulos no HMR).
// Ancorar no globalThis garante uma única instância por processo.
const GLOBAL_KEY = Symbol.for("empresa.threadEventEmitter");
const globalStore = globalThis as unknown as Record<
  symbol,
  ThreadEventEmitter | undefined
>;

export const threadEventEmitter: ThreadEventEmitter =
  globalStore[GLOBAL_KEY] ?? (globalStore[GLOBAL_KEY] = new ThreadEventEmitter());

/** Avisa os clientes conectados à thread que algo mudou. Chamar SEMPRE depois de persistir. */
export function notifyThread(ticketId: string, type: ThreadEventType): void {
  threadEventEmitter.emit(ticketId, { type, timestamp: Date.now() });
}
