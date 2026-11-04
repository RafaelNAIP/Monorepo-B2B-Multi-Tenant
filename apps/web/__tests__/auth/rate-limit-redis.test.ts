import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  createRedisRateLimiter,
  type RateLimitRedisClient,
} from "../../../../packages/auth/src/lib/rate-limit-redis";
import {
  checkRateLimit,
  resetRateLimitStore,
  type RateLimitConfig,
} from "../../../../packages/auth/src/lib/rate-limit";

// ─── Fake de Redis (sorted set) com a mesma superfície de pipeline do Upstash ──
// Executa os comandos de verdade em memória, então o algoritmo sliding window
// é exercitado de ponta a ponta (não só "a função foi chamada").

function createFakeRedis() {
  const sets = new Map<string, Map<string, number>>();

  const client: RateLimitRedisClient = {
    pipeline() {
      const ops: Array<() => unknown> = [];
      const p = {
        zremrangebyscore(key: string, min: number | string, max: number | string) {
          ops.push(() => {
            const set = sets.get(key) ?? new Map<string, number>();
            const lo = min === "-inf" ? -Infinity : Number(min);
            const hi = max === "+inf" ? Infinity : Number(max);
            let removed = 0;
            for (const [member, score] of set) {
              if (score >= lo && score <= hi) {
                set.delete(member);
                removed++;
              }
            }
            sets.set(key, set);
            return removed;
          });
          return p;
        },
        zadd(key: string, data: { score: number; member: string }) {
          ops.push(() => {
            const set = sets.get(key) ?? new Map<string, number>();
            set.set(data.member, data.score);
            sets.set(key, set);
            return 1;
          });
          return p;
        },
        zcard(key: string) {
          ops.push(() => (sets.get(key)?.size ?? 0));
          return p;
        },
        zrange(key: string, start: number, stop: number) {
          ops.push(() => {
            const sorted = [...(sets.get(key)?.entries() ?? [])]
              .sort((a, b) => a[1] - b[1])
              .map(([member]) => member);
            return sorted.slice(start, stop + 1);
          });
          return p;
        },
        zrem(key: string, ...members: string[]) {
          ops.push(() => {
            const set = sets.get(key);
            if (!set) return 0;
            let removed = 0;
            for (const m of members) if (set.delete(m)) removed++;
            return removed;
          });
          return p;
        },
        pexpire(_key: string, _ms: number) {
          ops.push(() => 1);
          return p;
        },
        async exec() {
          return ops.map((op) => op()) as unknown[];
        },
      };
      return p as unknown as ReturnType<RateLimitRedisClient["pipeline"]>;
    },
  };

  return { client, sets };
}

const loginConfig: RateLimitConfig = { windowMs: 60_000, maxRequests: 5 };

let now: number;
const setNow = (ms: number) => {
  now = ms;
  vi.setSystemTime(new Date(now));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow(new Date("2026-06-15T12:00:00Z").getTime());
  resetRateLimitStore();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("createRedisRateLimiter — básico", () => {
  it("permite requisição dentro do limite com remaining correto", async () => {
    const { client } = createFakeRedis();
    const limit = createRedisRateLimiter(client);

    const first = await limit("login:192.168.1.1", loginConfig);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(4);
    expect(first.retryAfterMs).toBe(0);
  });

  it("permite até o limite exato e depois bloqueia", async () => {
    const { client } = createFakeRedis();
    const limit = createRedisRateLimiter(client);
    const key = "login:10.0.0.1";

    for (let i = 0; i < 5; i++) {
      expect((await limit(key, loginConfig)).allowed).toBe(true);
    }
    const blocked = await limit(key, loginConfig);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("retorna remaining decrescente a cada chamada", async () => {
    const { client } = createFakeRedis();
    const limit = createRedisRateLimiter(client);
    const key = "login:10.0.0.3";

    expect((await limit(key, loginConfig)).remaining).toBe(4);
    expect((await limit(key, loginConfig)).remaining).toBe(3);
    expect((await limit(key, loginConfig)).remaining).toBe(2);
    expect((await limit(key, loginConfig)).remaining).toBe(1);
    expect((await limit(key, loginConfig)).remaining).toBe(0);
  });

  it("isola chaves diferentes (IPs diferentes não interferem)", async () => {
    const { client } = createFakeRedis();
    const limit = createRedisRateLimiter(client);

    for (let i = 0; i < 5; i++) await limit("login:a", loginConfig);
    expect((await limit("login:a", loginConfig)).allowed).toBe(false);
    expect((await limit("login:b", loginConfig)).allowed).toBe(true);
  });
});

describe("createRedisRateLimiter — sliding window", () => {
  it("libera após a janela expirar", async () => {
    const { client } = createFakeRedis();
    const limit = createRedisRateLimiter(client);
    const key = "login:10.0.0.4";

    for (let i = 0; i < 5; i++) await limit(key, loginConfig);
    expect((await limit(key, loginConfig)).allowed).toBe(false);

    setNow(now + 60_001);
    expect((await limit(key, loginConfig)).allowed).toBe(true);
  });

  it("requisição bloqueada não consome a janela", async () => {
    const { client, sets } = createFakeRedis();
    const limit = createRedisRateLimiter(client);
    const key = "login:10.0.0.5";

    for (let i = 0; i < 5; i++) await limit(key, loginConfig);
    await limit(key, loginConfig); // bloqueada
    await limit(key, loginConfig); // bloqueada

    // Continua exatamente em 5 entradas: bloqueios não gravam no sorted set
    expect(sets.get(key)?.size).toBe(5);
  });

  it("janela desliza: só libera a entrada mais antiga, não todas de uma vez", async () => {
    const { client } = createFakeRedis();
    const limit = createRedisRateLimiter(client);
    const key = "login:10.0.0.6";

    await limit(key, loginConfig); // t0
    setNow(now + 30_000);
    for (let i = 0; i < 4; i++) await limit(key, loginConfig); // t0+30s x4

    expect((await limit(key, loginConfig)).allowed).toBe(false);

    setNow(now + 30_001); // já passou 60s desde t0, mas não desde t0+30s
    const r = await limit(key, loginConfig);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0);
  });
});

describe("createRedisRateLimiter — falha do Redis (fail-open)", () => {
  it("permite a requisição e não lança quando o Redis cai", async () => {
    const broken: RateLimitRedisClient = {
      pipeline() {
        const p = {
          zremrangebyscore: () => p,
          zadd: () => p,
          zcard: () => p,
          zrange: () => p,
          zrem: () => p,
          pexpire: () => p,
          exec: async () => {
            throw new Error("upstash indisponível");
          },
        };
        return p as unknown as ReturnType<RateLimitRedisClient["pipeline"]>;
      },
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const limit = createRedisRateLimiter(broken);
    const result = await limit("login:offline", loginConfig);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(loginConfig.maxRequests);
    expect(result.retryAfterMs).toBe(0);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("getRateLimiter — seleção de backend", () => {
  it("sem UPSTASH_* usa o store em memória (mesmo estado de checkRateLimit)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { getRateLimiter } = await import(
      "../../../../packages/auth/src/lib/rate-limit-redis"
    );

    const limit = getRateLimiter();
    for (let i = 0; i < 5; i++) await limit("login:mem", loginConfig);

    // Compartilha o store síncrono: o 6º via checkRateLimit também é bloqueado
    expect(checkRateLimit("login:mem", loginConfig).allowed).toBe(false);
  });
});
