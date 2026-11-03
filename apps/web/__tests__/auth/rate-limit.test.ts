import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  checkRateLimit,
  resetRateLimitStore,
  type RateLimitConfig,
} from "../../../../packages/auth/src/lib/rate-limit";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  resetRateLimitStore();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Configurações de teste ─────────────────────────────────────

const loginConfig: RateLimitConfig = {
  windowMs: 60_000, // 1 min
  maxRequests: 5,
};

const presignConfig: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

const criticalConfig: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 20,
};

describe("checkRateLimit — básico", () => {
  it("permite requisição dentro do limite", () => {
    const result = checkRateLimit("login:192.168.1.1", loginConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 - 1
  });

  it("permite até o limite exato", () => {
    const key = "login:10.0.0.1";
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, loginConfig);
      expect(result.allowed).toBe(true);
    }
  });

  it("bloqueia após exceder o limite", () => {
    const key = "login:10.0.0.2";
    // 5 requisições OK
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, loginConfig);
    }
    // 6ª é bloqueada
    const result = checkRateLimit(key, loginConfig);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("retorna remaining correto a cada chamada", () => {
    const key = "login:10.0.0.3";
    expect(checkRateLimit(key, loginConfig).remaining).toBe(4);
    expect(checkRateLimit(key, loginConfig).remaining).toBe(3);
    expect(checkRateLimit(key, loginConfig).remaining).toBe(2);
    expect(checkRateLimit(key, loginConfig).remaining).toBe(1);
    expect(checkRateLimit(key, loginConfig).remaining).toBe(0);
    // Próxima é bloqueada
    expect(checkRateLimit(key, loginConfig).allowed).toBe(false);
  });
});

describe("checkRateLimit — sliding window", () => {
  it("libera após a janela expirar", () => {
    const key = "login:10.0.0.4";
    // Esgota o limite
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, loginConfig);
    }
    expect(checkRateLimit(key, loginConfig).allowed).toBe(false);

    // Avança 61 segundos (além da janela de 60s)
    vi.advanceTimersByTime(61_000);

    const result = checkRateLimit(key, loginConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("descarta apenas timestamps antigos (sliding, não fixo)", () => {
    const key = "login:10.0.0.5";

    // Faz 3 requisições no t=0
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, loginConfig);
    }

    // Avança 30s, faz mais 2 (total 5 na janela)
    vi.advanceTimersByTime(30_000);
    checkRateLimit(key, loginConfig);
    checkRateLimit(key, loginConfig);

    // Bloqueado agora (5 na janela)
    expect(checkRateLimit(key, loginConfig).allowed).toBe(false);

    // Avança mais 31s (total 61s desde as 3 primeiras, que saem da janela)
    vi.advanceTimersByTime(31_000);

    // Agora só as 2 do t=30s estão na janela
    const result = checkRateLimit(key, loginConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 5 - (2 velhas + 1 nova) = 2
  });
});

describe("checkRateLimit — isolamento de chaves", () => {
  it("chaves diferentes são independentes", () => {
    const key1 = "login:192.168.1.1";
    const key2 = "login:192.168.1.2";

    // Esgota key1
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key1, loginConfig);
    }
    expect(checkRateLimit(key1, loginConfig).allowed).toBe(false);

    // key2 ainda tem limite
    const result = checkRateLimit(key2, loginConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

describe("checkRateLimit — configs diferentes (presign, critical)", () => {
  it("presign permite 10/min", () => {
    const key = "presign:session-abc";
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(key, presignConfig).allowed).toBe(true);
    }
    expect(checkRateLimit(key, presignConfig).allowed).toBe(false);
  });

  it("critical permite 20/min", () => {
    const key = "critical:session-def";
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(key, criticalConfig).allowed).toBe(true);
    }
    expect(checkRateLimit(key, criticalConfig).allowed).toBe(false);
  });
});

describe("resetRateLimitStore", () => {
  it("limpa todo o estado", () => {
    const key = "login:10.0.0.10";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, loginConfig);
    }
    expect(checkRateLimit(key, loginConfig).allowed).toBe(false);

    resetRateLimitStore();

    const result = checkRateLimit(key, loginConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});
