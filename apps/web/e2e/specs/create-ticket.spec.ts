import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, prisma } from "../fixtures/world";
import { STATE } from "../support/paths";

test.use({ storageState: STATE.client });

test.describe("Criar chamado (cliente)", () => {
  test.beforeEach(async () => {
    await resetWorld();
  });

  test("validação mostra os erros de cada campo", async ({ page }) => {
    await page.goto(`/${TENANT.demo.slug}/chamados/novo`);
    await page.getByRole("button", { name: "Criar Chamado", exact: true }).click();

    await expect(page.getByText("Título deve ter ao menos 5 caracteres")).toBeVisible();
    await expect(page.locator("#category-error")).toHaveText("Selecione uma categoria");
    await expect(page.getByText("Descrição deve ter ao menos 10 caracteres")).toBeVisible();
  });

  test("cria o chamado e volta ao dashboard com ele na lista", async ({ page }) => {
    const title = "Teste E2E: VPN não conecta no home office";
    const before = await prisma.ticket.count({ where: { tenantId: TENANT.demo.id } });

    await page.goto(`/${TENANT.demo.slug}/chamados/novo`);
    await page.getByLabel("Título").fill(title);
    await page.getByLabel("Categoria").selectOption("ti");
    await page.getByLabel("Descrição").fill("A conexão VPN cai logo após o login, desde ontem à tarde.");
    await page.getByRole("button", { name: "Criar Chamado", exact: true }).click();

    await page.waitForURL((url) => url.pathname === `/${TENANT.demo.slug}/dashboard`);
    await page.goto(`/${TENANT.demo.slug}/dashboard?search=${encodeURIComponent(title)}`);
    await expect(page.getByRole("cell", { name: title })).toBeVisible();

    const after = await prisma.ticket.count({ where: { tenantId: TENANT.demo.id } });
    expect(after).toBe(before + 1);
  });
});
