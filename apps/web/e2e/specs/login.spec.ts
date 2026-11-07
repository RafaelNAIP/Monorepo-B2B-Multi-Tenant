import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, USER, DEFAULT_PASSWORD } from "../fixtures/world";
import { loginViaUi } from "../support/auth";
import { TEXT } from "../support/texts";

test.describe("Login e proteção de rotas", () => {
  test.beforeEach(async () => {
    await resetWorld();
  });

  test("visitante sem sessão é redirecionado para o login do tenant", async ({ page }) => {
    await page.goto(`/${TENANT.demo.slug}/dashboard`);
    await page.waitForURL((url) => url.pathname === `/${TENANT.demo.slug}/auth`);
    expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(`/${TENANT.demo.slug}/dashboard`);
  });

  test("cliente entra e cai no dashboard", async ({ page }) => {
    await loginViaUi(page, {
      tenant: TENANT.demo.slug,
      email: USER.clientDemo.email,
      role: "Cliente",
      expectPath: `/${TENANT.demo.slug}/dashboard`,
    });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("administrador entra e cai no painel admin", async ({ page }) => {
    await loginViaUi(page, {
      tenant: TENANT.demo.slug,
      email: USER.adminDemo.email,
      role: "Administrador",
      expectPath: `/${TENANT.demo.slug}/admin`,
    });
    await expect(page.getByRole("link", { name: "Painel Admin" })).toBeVisible();
  });

  test("senha errada mostra erro genérico", async ({ page }) => {
    await page.goto(`/${TENANT.demo.slug}/auth`);
    await page.getByLabel("E-mail").fill(USER.clientDemo.email);
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: TEXT.invalidCredentials })).toBeVisible();
  });

  test("papel incorreto mostra a MESMA mensagem (sem enumeração de usuários)", async ({ page }) => {
    await page.goto(`/${TENANT.demo.slug}/auth`);
    // admin@demo.com existe, mas como cliente não: deve parecer credencial inválida
    await page.getByLabel("Cliente", { exact: true }).check();
    await page.getByLabel("E-mail").fill(USER.adminDemo.email);
    await page.getByLabel("Senha").fill(DEFAULT_PASSWORD);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: TEXT.invalidCredentials })).toBeVisible();
  });

  test("usuário de outro tenant não entra no tenant demo", async ({ page }) => {
    await page.goto(`/${TENANT.demo.slug}/auth`);
    await page.getByLabel("E-mail").fill(USER.adminAcme.email);
    await page.getByLabel("Senha").fill(DEFAULT_PASSWORD);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: TEXT.invalidCredentials })).toBeVisible();
  });
});
