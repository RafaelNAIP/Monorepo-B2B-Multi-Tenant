import { defineConfig, devices } from "@playwright/test";

/**
 * E2E do app web. O script `npm run test:e2e` (raiz) sobe o MongoDB em
 * memória com replica set, exporta as variáveis de ambiente e builda o app
 * antes de chamar este config. Ver e2e/scripts/run.mjs.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.(setup|spec)\.ts/,
  outputDir: "./e2e/test-results",
  // Um único worker: os specs reconstroem o mesmo banco. Paralelismo fica para depois.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "./e2e/playwright-report", open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // O build já foi feito pelo run.mjs; aqui só sobe o servidor de produção.
    command: `npm run start -w @empresa/web -- -p ${PORT}`,
    cwd: "../..",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
