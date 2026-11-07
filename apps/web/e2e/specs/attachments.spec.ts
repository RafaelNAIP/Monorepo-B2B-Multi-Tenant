import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, prisma } from "../fixtures/world";
import { mockR2Upload, TINY_PNG } from "../support/r2-mock";
import { STATE } from "../support/paths";

test.use({ storageState: STATE.client });

test.describe("Anexos no chamado (R2 interceptado)", () => {
  test.beforeEach(async () => {
    await resetWorld();
  });

  test("anexa uma imagem ao criar o chamado", async ({ page }) => {
    await mockR2Upload(page);
    const title = "Erro na tela de faturamento com print";

    await page.goto(`/${TENANT.demo.slug}/chamados/novo`);
    await page.getByRole("button", { name: /Anexar imagens/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "comprovante.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });

    await expect(page.getByText("Enviada")).toBeVisible();
    await page.getByRole("button", { name: /Confirmar \(1\)/ }).click();
    await expect(page.getByText("comprovante.png")).toBeVisible();

    await page.getByLabel("Título").fill(title);
    await page.getByLabel("Categoria").selectOption("ti");
    await page.getByLabel("Descrição").fill("O botão de emitir fatura não responde após o print.");
    await page.getByRole("button", { name: "Criar Chamado", exact: true }).click();

    await page.waitForURL((url) => url.pathname === `/${TENANT.demo.slug}/dashboard`);

    const ticket = await prisma.ticket.findFirstOrThrow({
      where: { title, tenantId: TENANT.demo.id },
      include: { attachments: true },
    });
    expect(ticket.attachments.map((a: { fileName: string }) => a.fileName)).toContain("comprovante.png");
  });
});
