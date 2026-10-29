/** Comentário SSE periódico para proxies/load balancers não fecharem a conexão ociosa. */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Delay que o EventSource do navegador espera antes de reconectar (campo `retry`). */
export const RECONNECT_DELAY_MS = 3_000;

export function threadEventsUrl(ticketId: string): string {
  return `/api/threads/${encodeURIComponent(ticketId)}/events`;
}

/** Erros consecutivos do EventSource antes de cair para polling. */
export const MAX_SSE_ERRORS = 3;

/** Intervalo do polling de segurança enquanto o SSE está fora do ar. */
export const FALLBACK_POLL_INTERVAL_MS = 5_000;

/** Quando o navegador desiste do EventSource (readyState CLOSED), tentamos reabrir após este tempo. */
export const SSE_REOPEN_DELAY_MS = 15_000;
