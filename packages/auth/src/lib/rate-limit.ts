// ─── In-memory sliding window rate limiter (edge-safe) ──────────
// Será substituído por Redis na próxima iteração.

export interface RateLimitConfig {
  /** Tamanho da janela em milissegundos */
  windowMs: number;
  /** Máximo de requisições por janela */
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requisições restantes na janela atual */
  remaining: number;
  /** Ms até poder tentar novamente (0 se allowed) */
  retryAfterMs: number;
}

// ─── Presets para uso nos Server Actions ─────────────────────────

/** Login: 5 req/min por IP */
export const RATE_LIMIT_LOGIN: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 5,
};

/** Presign upload: 10 req/min por sessão */
export const RATE_LIMIT_PRESIGN: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

/** Ações críticas (delete, role change): 20 req/min */
export const RATE_LIMIT_CRITICAL: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 20,
};

// ─── Store (Map<key, timestamps[]>) ─────────────────────────────

const store = new Map<string, number[]>();

/**
 * Verifica se a requisição é permitida dentro do rate limit.
 *
 * @param key - Identificador único (ex: "login:192.168.1.1")
 * @param config - Configuração de janela e limite
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Filtra timestamps dentro da janela
  const existing = store.get(key) ?? [];
  const inWindow = existing.filter((ts) => ts > windowStart);

  if (inWindow.length >= config.maxRequests) {
    // Bloqueado — calcula tempo até o mais antigo sair da janela
    const oldestInWindow = inWindow[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;

    store.set(key, inWindow);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 0),
    };
  }

  // Permitido — registra timestamp
  inWindow.push(now);
  store.set(key, inWindow);

  return {
    allowed: true,
    remaining: config.maxRequests - inWindow.length,
    retryAfterMs: 0,
  };
}

/** Limpa todo o store (para testes) */
export function resetRateLimitStore(): void {
  store.clear();
}
