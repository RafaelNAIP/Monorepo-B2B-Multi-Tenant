import type { ThreadEventChannel } from "./channel";
import type { ThreadEvent, ThreadEventCallback } from "./thread-event-emitter";

/**
 * Canal de eventos em memória. Funciona para um único processo / instância.
 *
 * É equivalente ao ThreadEventEmitter existente, refatorado para implementar
 * a interface ThreadEventChannel.
 */
export class InMemoryChannel implements ThreadEventChannel {
  private listeners = new Map<string, Set<ThreadEventCallback>>();

  subscribe(ticketId: string, callback: ThreadEventCallback): () => void {
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

  publish(ticketId: string, event: Omit<ThreadEvent, "ticketId">): void {
    const set = this.listeners.get(ticketId);
    if (!set) return;

    const fullEvent: ThreadEvent = { ...event, ticketId };
    for (const listener of [...set]) {
      try {
        listener(fullEvent);
      } catch (error) {
        console.error("[InMemoryChannel] subscriber falhou", error);
      }
    }
  }

  subscriberCount(ticketId: string): number {
    return this.listeners.get(ticketId)?.size ?? 0;
  }
}
