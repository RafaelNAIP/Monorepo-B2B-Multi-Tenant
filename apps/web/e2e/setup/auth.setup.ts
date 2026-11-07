import { test } from "../fixtures/test";
import { resetWorld, TENANT, USER } from "../fixtures/world";
import { loginViaUi } from "../support/auth";
import { STATE } from "../support/paths";

// Loga pela tela real, uma vez por papel, e salva o cookie HMAC em storageState.
// Os specs reusam esses arquivos, então não repetem o login a cada teste.

test.beforeAll(async () => {
  await resetWorld();
});

test("gera sessão do administrador (demo)", async ({ page }) => {
  await loginViaUi(page, {
    tenant: TENANT.demo.slug,
    email: USER.adminDemo.email,
    role: "Administrador",
    expectPath: `/${TENANT.demo.slug}/admin`,
  });
  await page.context().storageState({ path: STATE.admin });
});

test("gera sessão do cliente (demo)", async ({ page }) => {
  await loginViaUi(page, {
    tenant: TENANT.demo.slug,
    email: USER.clientDemo.email,
    role: "Cliente",
    expectPath: `/${TENANT.demo.slug}/dashboard`,
  });
  await page.context().storageState({ path: STATE.client });
});
