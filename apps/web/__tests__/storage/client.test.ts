import { afterEach, describe, expect, it } from "vitest";

import { getMissingR2Vars, isR2Configured } from "@/lib/storage/client";

const R2_VARS = {
  R2_ENDPOINT: "https://r2.test",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "bucket",
};

function setR2Vars(overrides: Partial<typeof R2_VARS> = {}) {
  const merged = { ...R2_VARS, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v) process.env[k] = v;
    else delete process.env[k];
  }
}

function clearR2Vars() {
  for (const k of Object.keys(R2_VARS)) delete process.env[k];
}

afterEach(clearR2Vars);

describe("isR2Configured", () => {
  it("retorna true quando todas as variáveis estão presentes", () => {
    setR2Vars();
    expect(isR2Configured()).toBe(true);
  });

  it("retorna false quando falta pelo menos uma variável", () => {
    setR2Vars();
    delete process.env.R2_ENDPOINT;
    expect(isR2Configured()).toBe(false);
  });

  it("retorna false quando nenhuma variável está configurada", () => {
    clearR2Vars();
    expect(isR2Configured()).toBe(false);
  });
});

describe("getMissingR2Vars", () => {
  it("lista as variáveis ausentes", () => {
    setR2Vars();
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_BUCKET_NAME;
    const missing = getMissingR2Vars();
    expect(missing).toContain("R2_ENDPOINT");
    expect(missing).toContain("R2_BUCKET_NAME");
    expect(missing).not.toContain("R2_ACCESS_KEY_ID");
  });

  it("retorna lista vazia quando tudo está configurado", () => {
    setR2Vars();
    expect(getMissingR2Vars()).toEqual([]);
  });
});
