import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  signSessionToken,
  verifySessionToken,
} from "../../../../packages/auth/src/lib/token";
import type { SessionPayload } from "../../../../packages/auth/src/lib/payload";

const TEST_SECRET = "test-secret-key-at-least-32-chars-long!!";

const validPayload: SessionPayload = {
  sub: "507f1f77bcf86cd799439011",
  email: "admin@demo.com",
  name: "João Admin",
  tenantId: "507f1f77bcf86cd799439012",
  tenantSlug: "demo",
  role: "admin",
  iat: 1730000000, // fixo para testes
  exp: 1730000000 + 2592000, // +30 dias
};

describe("signSessionToken", () => {
  it("retorna string no formato base64url.base64url", async () => {
    const token = await signSessionToken(validPayload, TEST_SECRET);
    expect(typeof token).toBe("string");
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    // Ambas as partes devem ser base64url válido (sem +, /, =)
    for (const part of parts) {
      expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("gera tokens diferentes para payloads diferentes", async () => {
    const token1 = await signSessionToken(validPayload, TEST_SECRET);
    const token2 = await signSessionToken(
      { ...validPayload, sub: "outro-id-diferente-12345678" },
      TEST_SECRET
    );
    expect(token1).not.toBe(token2);
  });

  it("gera tokens diferentes para secrets diferentes", async () => {
    const token1 = await signSessionToken(validPayload, TEST_SECRET);
    const token2 = await signSessionToken(
      validPayload,
      "outro-secret-completamente-diferente!!"
    );
    expect(token1).not.toBe(token2);
  });

  it("lança erro se secret for string vazia", async () => {
    await expect(signSessionToken(validPayload, "")).rejects.toThrow();
  });
});

describe("verifySessionToken", () => {
  it("retorna payload original para token válido", async () => {
    // Fixa o tempo ANTES da expiração do payload de teste
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date((validPayload.iat + 60) * 1000));
      const token = await signSessionToken(validPayload, TEST_SECRET);
      const result = await verifySessionToken(token, TEST_SECRET);
      expect(result).toEqual(validPayload);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retorna null para token com payload adulterado (1 byte trocado)", async () => {
    const token = await signSessionToken(validPayload, TEST_SECRET);
    const parts = token.split(".");
    // Altera um caractere no payload
    const tampered =
      parts[0].substring(0, 5) +
      (parts[0][5] === "A" ? "B" : "A") +
      parts[0].substring(6);
    const result = await verifySessionToken(
      `${tampered}.${parts[1]}`,
      TEST_SECRET
    );
    expect(result).toBeNull();
  });

  it("retorna null para token com assinatura adulterada", async () => {
    const token = await signSessionToken(validPayload, TEST_SECRET);
    const parts = token.split(".");
    // Altera um caractere na assinatura
    const tampered =
      parts[1].substring(0, 3) +
      (parts[1][3] === "X" ? "Y" : "X") +
      parts[1].substring(4);
    const result = await verifySessionToken(
      `${parts[0]}.${tampered}`,
      TEST_SECRET
    );
    expect(result).toBeNull();
  });

  it("retorna null para token expirado", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      // Cria token com expiração no passado
      const expiredPayload: SessionPayload = {
        ...validPayload,
        iat: 1700000000,
        exp: 1700000000 + 10, // expirou 10s depois
      };
      const token = await signSessionToken(expiredPayload, TEST_SECRET);

      // Avança o tempo para depois da expiração
      vi.setSystemTime(new Date((1700000000 + 100) * 1000));

      const result = await verifySessionToken(token, TEST_SECRET);
      expect(result).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("retorna null para token malformado (sem ponto separador)", async () => {
    const result = await verifySessionToken(
      "tokenSemPontoSeparador",
      TEST_SECRET
    );
    expect(result).toBeNull();
  });

  it("retorna null para token com base64 inválido", async () => {
    const result = await verifySessionToken("!!!.???", TEST_SECRET);
    expect(result).toBeNull();
  });

  it("retorna null para string vazia", async () => {
    const result = await verifySessionToken("", TEST_SECRET);
    expect(result).toBeNull();
  });

  it("retorna null para token com secret errado", async () => {
    const token = await signSessionToken(validPayload, TEST_SECRET);
    const result = await verifySessionToken(token, "secret-errado-diferente!!");
    expect(result).toBeNull();
  });

  it("lança erro se secret for string vazia", async () => {
    const token = await signSessionToken(validPayload, TEST_SECRET);
    await expect(verifySessionToken(token, "")).rejects.toThrow();
  });
});
