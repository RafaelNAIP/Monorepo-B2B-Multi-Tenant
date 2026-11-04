import type { ThreadEvent, ThreadEventChannel } from "./channel";
import { RedisChannel } from "./channel-redis";

export interface RemoteSyncOptions {
  /** Intervalo entre leituras no Redis. */
  intervalMs: number;
  /** Início da conexão: eventos anteriores não são entregues. */
  sinceTs: number;
}

/**
 * Polling do lado do servidor, dentro da conexão SSE, para receber eventos
 * publicados por OUTRAS instâncias. Só ativa com RedisChannel; com canal em
 * memória não faz nada (instância única não precisa de fan-out).
 *
 * Não sobrepõe leituras: se uma ainda está em voo, o tick seguinte é pulado.
 * Retorna a função de parada, que deve ser chamada no cleanup da conexão.
 */
export function startRemoteSync(
  channel: ThreadEventChannel,
  ticketId: string,
  onEvent: (event: ThreadEvent) => void,
  options: RemoteSyncOptions
): () => void {
  if (!(channel instanceof RedisChannel)) return () => {};

  const cursor = { sinceTs: options.sinceTs, seen: new Set<string>() };
  let inFlight = false;
  let stopped = false;

  const timer = setInterval(async () => {
    if (inFlight || stopped) return;
    inFlight = true;
    try {
      const events = await channel.drainRemote(ticketId, cursor);
      for (const event of events) {
        if (stopped) break;
        try {
          onEvent(event);
        } catch (error) {
          console.error("[remote-sync] falha ao entregar evento", error);
        }
      }
    } finally {
      inFlight = false;
    }
  }, options.intervalMs);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
