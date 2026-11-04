import { Redis } from "@upstash/redis";

// ─── Cliente Redis (Upstash, HTTP) ──────────────────────────────
// HTTP é serverless-friendly: sem pool de conexão TCP para gerenciar em
// Vercel. Singleton via globalThis (mesmo padrão do getR2Client).

const GLOBAL_KEY = Symbol.for("empresa.upstashRedis");
const globalStore = globalThis as unknown as Record<symbol, Redis | undefined>;

/** true quando as duas variáveis do Upstash estão presentes e não vazias. */
export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function getRedis(): Redis {
  const existing = globalStore[GLOBAL_KEY];
  if (existing) return existing;

  const client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  });
  globalStore[GLOBAL_KEY] = client;
  return client;
}
