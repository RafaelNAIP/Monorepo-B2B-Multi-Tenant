import { getRateLimiter, RATE_LIMIT_CRITICAL, rateLimitMessage } from "@empresa/auth/rate-limit";

import type { ActionState } from "@/lib/shared/action-state";

/**
 * Guarda de rate limit para ações críticas (20/min por sessão).
 * Retorna `null` quando permitido, ou um ActionState de erro em PT quando
 * bloqueado. Chamar DEPOIS de `requireSession`, para ter o `sub`.
 */
export async function guardCriticalAction(
  scope: string,
  sub: string
): Promise<ActionState | null> {
  const limit = await getRateLimiter()(`critical:${scope}:${sub}`, RATE_LIMIT_CRITICAL);
  if (limit.allowed) return null;

  return {
    success: false,
    error: rateLimitMessage(limit.retryAfterMs),
    fieldErrors: {},
  };
}
