import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, TICKET, USER, prisma } from "../fixtures/world";
import { openAnonymousPage } from "../support/anon";
import { STATE } from "../support/paths";
import { TEXT } from "../support/texts";

/**
 * Fluxo completo da thread: admin gera link público, cliente conversa
 * SEM login (contexto anônimo), admin encerra a conversa.
 */
test.describe("Thread admin ↔ cliente pelo link público", () => {
  test.use({ storageState: STATE.admin });

  test.beforeEach(async () => {
    await resetWorld();
  });

  test("admin gera link, troca mensagens com o cliente e encerra a conversa", async ({ page, browser }) => {
    await page.goto(`/${TENANT.demo.slug}/admin/chamados/${TICKET.inProgress.id}`);

    // Gate: só é possível encerrar depois que o cliente se conectou.
    await expect(page.getByRole("button", { name: "Encerrar conversa", exact: true })).toBeDisabled();

    // 1. Admin gera o link público
    await page.getByRole("button", { name: "Gerar link para cliente", exact: true }).click();
    await page.getByLabel("Nome do cliente").fill(USER.clientDemo.name);
    await page.getByLabel("E-mail do cliente").fill(USER.clientDemo.email);
    await page.getByRole("button", { name: "Gerar link", exact: true }).click();

    const linkCode = page.locator("code").filter({ hasText: `/${TENANT.demo.slug}/thread/` });
    await expect(linkCode).toBeVisible();
    const link = (await linkCode.textContent()) ?? "";
    expect(link).toMatch(new RegExp(`^/${TENANT.demo.slug}/thread/.+`));

    // 2. Admin envia a primeira mensagem
    await page.getByLabel("Mensagem", { exact: true }).fill("Olá Maria, estou analisando a nota fiscal.");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(page.getByText("Olá Maria, estou analisando a nota fiscal.")).toBeVisible();

    // 3. Cliente abre o link SEM sessão e responde
    const { context, page: clientPage } = await openAnonymousPage(browser);
    await clientPage.goto(link);
    await expect(clientPage.getByText("Olá Maria, estou analisando a nota fiscal.")).toBeVisible();
    await clientPage.getByLabel("Mensagem", { exact: true }).fill("Obrigada, o erro continua aparecendo.");
    await clientPage.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(clientPage.getByText("Obrigada, o erro continua aparecendo.")).toBeVisible();

    // 4. Admin recebe a mensagem do cliente (polling de segurança, sem recarregar)
    await expect(page.getByText("Obrigada, o erro continua aparecendo.")).toBeVisible({ timeout: 15_000 });

    // 5. Admin encerra: agora o botão está habilitado
    const disconnect = page.getByRole("button", { name: "Encerrar conversa", exact: true });
    await expect(disconnect).toBeEnabled();
    await disconnect.click();

    await expect(page.getByText(TEXT.waitingFeedback)).toBeVisible();
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: TICKET.inProgress.id } });
    expect(ticket.status).toBe("pending_feedback");
    expect(ticket.feedbackDeadline).not.toBeNull();

    await context.close();
  });

  test("token inválido não abre a thread (404)", async ({ browser }) => {
    const { context, page } = await openAnonymousPage(browser);
    const response = await page.goto(`/${TENANT.demo.slug}/thread/token-que-nao-existe`);
    expect(response?.status()).toBe(404);
    await context.close();
  });
});
