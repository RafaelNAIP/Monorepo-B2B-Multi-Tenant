import { checkRateLimit, type RateLimitConfig, type RateLimitResult } from "./rate-limit";
import { getRedis, isRedisConfigured } from "./redis-client";

// ─── Contrato mínimo do Redis usado pelo rate limit ─────────────
// Superfície estreita (só pipeline) para o teste injetar um fake fiel.

export interface RateLimitPipeline {
  zremrangebyscore(key: string, min: number | string, max: number | string): RateLimitPipeline;
  zadd(key: string, data: { score: number; member: string }): RateLimitPipeline;
  zcard(key: string): RateLimitPipeline;
  zrange(key: string, start: number, stop: number): RateLimitPipeline;
  zrem(key: string, ...members: string[]): RateLimitPipeline;
  pexpire(key: string, ms: number): RateLimitPipeline;
  exec<T extends unknown[] = unknown[]>(): Promise<T>;
}

export interface RateLimitRedisClient {
  pipeline(): RateLimitPipeline;
}

/** Mesmo retorno do checkRateLimit, mas assíncrono (o store é remoto). */
export type AsyncRateLimiter = (
  key: string,
  config: RateLimitConfig
) => Promise<RateLimitResult>;

// ─── Sliding window sobre sorted set ────────────────────────────
// Cada requisição vira um membro `${timestamp}:${uuid}` no score `timestamp`.
// Uma única pipeline (uma ida ao Redis): limpa a janela, grava, conta e lê o
// mais antigo. Se passou do limite, o membro recém-gravado é removido, então
// bloqueios não consomem a janela (igual ao checkRateLimit em memória).

export function createRedisRateLimiter(redis: RateLimitRedisClient): AsyncRateLimiter {
  return async (key, config) => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const member = `${now}:${crypto.randomUUID()}`;

    try {
      const [, , count, oldest] = await redis
        .pipeline()
        .zremrangebyscore(key, "-inf", windowStart)
        .zadd(key, { score: now, member })
        .zcard(key)
        .zrange(key, 0, 0)
        .pexpire(key, config.windowMs)
        .exec<[number, number, number, string[], number]>();

      if (count <= config.maxRequests) {
        return {
          allowed: true,
          remaining: config.maxRequests - count,
          retryAfterMs: 0,
        };
      }

      // Bloqueado: desfaz a gravação para não consumir a janela
      await redis.pipeline().zrem(key, member).exec();

      const oldestTs = Number(oldest?.[0]?.split(":")[0] ?? now);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(oldestTs + config.windowMs - now, 0),
      };
    } catch (error) {
      // Fail-open: se o Redis cair, não derruba login nem ações
      console.error("[rate-limit] Redis indisponível, permitindo requisição", error);
      return { allowed: true, remaining: config.maxRequests, retryAfterMs: 0 };
    }
  };
}

/**
 * Seleciona o backend pelo ambiente:
 * - UPSTASH_* presentes → store compartilhado entre instâncias (produção).
 * - Ausentes → store em memória (dev/testes), mesmo estado do checkRateLimit.
 */
export function getRateLimiter(): AsyncRateLimiter {
  if (isRedisConfigured()) {
    return createRedisRateLimiter(getRedis() as unknown as RateLimitRedisClient);
  }
  return async (key, config) => checkRateLimit(key, config);
}

// ─── Helpers compartilhados por login e actions ─────────────────

export { RATE_LIMIT_CRITICAL, RATE_LIMIT_LOGIN, RATE_LIMIT_PRESIGN, checkRateLimit } from "./rate-limit";

/** Mensagem em PT para o usuário bloqueado. Arredonda para cima, mínimo 1s. */
export function rateLimitMessage(retryAfterMs: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return `Muitas tentativas. Tente novamente em ${seconds}s.`;
}

/**
 * IP do cliente a partir dos headers. Pega o primeiro da cadeia
 * `x-forwarded-for` (IP original atrás do proxy da Vercel).
 * Fallback: `x-real-ip`, depois "unknown".
 */
export function clientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
