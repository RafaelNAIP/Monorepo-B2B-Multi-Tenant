import { describe, it, expect } from "vitest";

import {
  hashPassword,
  verifyPassword,
} from "../../../../packages/auth/src/lib/password";

describe("hashPassword", () => {
  it("retorna um hash diferente da senha original", async () => {
    const hash = await hashPassword("senha@123");
    expect(hash).not.toBe("senha@123");
  });

  it("retorna um hash no formato bcrypt ($2b$)", async () => {
    const hash = await hashPassword("senha@123");
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const hash1 = await hashPassword("senha@123");
    const hash2 = await hashPassword("senha@123");
    expect(hash1).not.toBe(hash2);
  });

  it("usa 12 salt rounds (custo no hash)", async () => {
    const hash = await hashPassword("senha@123");
    // Formato bcrypt: $2b$<rounds>$...
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });
});

describe("verifyPassword", () => {
  it("retorna true para senha correta", async () => {
    const hash = await hashPassword("senha@123");
    const result = await verifyPassword("senha@123", hash);
    expect(result).toBe(true);
  });

  it("retorna false para senha incorreta", async () => {
    const hash = await hashPassword("senha@123");
    const result = await verifyPassword("outra-senha", hash);
    expect(result).toBe(false);
  });

  it("retorna false para senha vazia", async () => {
    const hash = await hashPassword("senha@123");
    const result = await verifyPassword("", hash);
    expect(result).toBe(false);
  });

  it("distingue senhas que diferem apenas por espaço", async () => {
    const hash = await hashPassword("senha@123");
    const result = await verifyPassword("senha@123 ", hash);
    expect(result).toBe(false);
  });

  it("distingue senhas case-sensitive", async () => {
    const hash = await hashPassword("Senha@123");
    const result = await verifyPassword("senha@123", hash);
    expect(result).toBe(false);
  });
});
