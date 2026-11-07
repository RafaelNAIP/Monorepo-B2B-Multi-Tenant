import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, prisma } from "../fixtures/world";
import { STATE } from "../support/paths";
import { TEXT } from "../support/texts";

test.describe("Editor de tema (administrador)", () => {
  test.beforeEach(async () => {
    await resetWorld();
  });

  test.describe("como administrador", () => {
    test.use({ storageState: STATE.admin });

    test("salva o tema, persiste no banco e mantém após recarregar", async ({ page }) => {
      await page.goto(`/${TENANT.demo.slug}/admin/tema`);

      await page.locator("#companyName").fill("Demo Corp Atualizada");
      await page.locator("#primaryColor").fill("#7c3aed");
      await page.locator("#borderRadius").fill("12");
      await page.locator("#logoUrl").fill("https://placehold.co/120x40?text=E2E");
      await page.getByRole("button", { name: "Salvar Configurações", exact: true }).click();

      await expect(page.getByText(TEXT.themeSaved)).toBeVisible();

      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: TENANT.demo.id } });
      expect(tenant.name).toBe("Demo Corp Atualizada");
      expect((tenant.theme as { primaryColor: string }).primaryColor).toBe("#7c3aed");

      await page.reload();
      await expect(page.locator("#companyName")).toHaveValue("Demo Corp Atualizada");
    });
  });

  test.describe("como cliente", () => {
    test.use({ storageState: STATE.client });

    test("cliente não acessa o editor de tema", async ({ page }) => {
      await page.goto(`/${TENANT.demo.slug}/admin/tema`);
      await page.waitForURL((url) => url.pathname === `/${TENANT.demo.slug}/dashboard`);
    });
  });
});
