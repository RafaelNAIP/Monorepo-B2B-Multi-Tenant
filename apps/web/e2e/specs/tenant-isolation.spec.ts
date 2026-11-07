import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, THREAD_TOKEN } from "../fixtures/world";
import { openAnonymousPage } from "../support/anon";
import { STATE } from "../support/paths";

test.describe("Isolamento multi-tenant", () => {
  test.beforeEach(async () => {
    await resetWorld();
  });

  test.describe("sessão do tenant demo", () => {
    test.use({ storageState: STATE.client });

    test("cliente do demo é barrado ao acessar o path do tenant acme", async ({ page }) => {
      await page.goto(`/${TENANT.acme.slug}/dashboard`);
      await page.waitForURL((url) => url.pathname === `/${TENANT.acme.slug}/auth`);
    });

    test("admin do demo é barrado no painel do tenant acme", async ({ page }) => {
      await page.goto(`/${TENANT.acme.slug}/admin`);
      await page.waitForURL((url) => url.pathname === `/${TENANT.acme.slug}/auth`);
    });
  });

  test("token de thread do tenant demo não abre no path do tenant acme", async ({ browser }) => {
    const { context, page } = await openAnonymousPage(browser);
    const response = await page.goto(`/${TENANT.acme.slug}/thread/${THREAD_TOKEN.pending}`);
    expect(response?.status()).toBe(404);
    await context.close();
  });
});
