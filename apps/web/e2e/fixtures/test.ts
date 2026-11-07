import { test as base, expect } from "@playwright/test";

/**
 * O login tem limite de 5 req/min por IP (in-memory, sem Redis no E2E).
 * Cada teste recebe um IP lógico próprio via X-Forwarded-For, então os
 * logins de um teste não consomem a cota dos outros. Não exige hook no app.
 */
let sequence = 0;
const base36Seed = Math.floor(Math.random() * 200) + 10;

export function nextClientIp(): string {
  sequence += 1;
  const third = Math.floor(sequence / 254) % 254 + 1;
  const fourth = (sequence % 254) + 1;
  return `10.${base36Seed}.${third}.${fourth}`;
}

export const test = base.extend<{ clientIp: string }>({
  clientIp: async ({}, use) => {
    await use(nextClientIp());
  },
  page: async ({ page, clientIp }, use) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": clientIp });
    await use(page);
  },
});

export { expect };
