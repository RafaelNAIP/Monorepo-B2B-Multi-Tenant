import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, TICKET, prisma, USER } from "../fixtures/world";
import { STATE } from "../support/paths";
import { TEXT } from "../support/texts";

test.describe("Administrador assume chamado", () => {
  test.beforeEach(async () => {
    await resetWorld();
  });

  test.describe("como administrador", () => {
    test.use({ storageState: STATE.admin });

    test("assumir um chamado aberto muda o status para em andamento", async ({ page }) => {
      await page.goto(
        `/${TENANT.demo.slug}/admin/chamados?status=open&search=${encodeURIComponent(TICKET.open.title)}`
      );

      const row = page.getByRole("row", { name: new RegExp(TICKET.open.title) });
      await row.getByRole("button", { name: "Assumir", exact: true }).click();

      await expect(page.getByText(TEXT.assignSuccess)).toBeVisible();

      const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: TICKET.open.id } });
      expect(updated.status).toBe("in_progress");
      expect(updated.assignedTo).toBe(USER.adminDemo.id);
    });
  });

  test.describe("como cliente", () => {
    test.use({ storageState: STATE.client });

    test("cliente não acessa o painel admin e é redirecionado ao dashboard", async ({ page }) => {
      await page.goto(`/${TENANT.demo.slug}/admin/chamados`);
      await page.waitForURL((url) => url.pathname === `/${TENANT.demo.slug}/dashboard`);
    });
  });
});
