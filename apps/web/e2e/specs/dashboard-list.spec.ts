import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, TICKET, prisma } from "../fixtures/world";
import { STATE } from "../support/paths";
import { TEXT } from "../support/texts";

test.use({ storageState: STATE.client });

test.describe("Dashboard do cliente: lista, filtros e paginação", () => {
  test.beforeEach(async () => {
    await resetWorld();
  });

  test("lista os chamados do tenant com contagem e paginação", async ({ page }) => {
    const total = await prisma.ticket.count({ where: { tenantId: TENANT.demo.id } });
    const pages = Math.ceil(total / 10);

    await page.goto(`/${TENANT.demo.slug}/dashboard`);
    await expect(page.getByText(`${total} chamado(s)`)).toBeVisible();
    await expect(page.getByText(`Página 1 de ${pages}`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Anterior" })).toHaveCount(0);

    await page.getByRole("link", { name: "Próxima" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(`Página 2 de ${pages}`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Anterior" })).toBeVisible();
  });

  test("filtro por status na URL restringe a lista", async ({ page }) => {
    const expected = await prisma.ticket.count({
      where: { tenantId: TENANT.demo.id, status: "resolved" },
    });

    await page.goto(`/${TENANT.demo.slug}/dashboard?status=resolved`);
    await expect(page.getByRole("cell", { name: "Resolvido", exact: true })).toHaveCount(expected);
    await expect(page.getByRole("cell", { name: TICKET.open.title })).toHaveCount(0);
  });

  test("busca por título encontra o chamado", async ({ page }) => {
    await page.goto(`/${TENANT.demo.slug}/dashboard?search=${encodeURIComponent("Impressora")}`);
    await expect(page.getByRole("cell", { name: TICKET.open.title })).toBeVisible();
  });

  test("isolamento: chamados de outro tenant não aparecem na busca", async ({ page }) => {
    await page.goto(`/${TENANT.demo.slug}/dashboard?search=${encodeURIComponent("Acesso ao sistema de RH")}`);
    await expect(page.getByText(TEXT.noTicketsFound)).toBeVisible();
  });
});
