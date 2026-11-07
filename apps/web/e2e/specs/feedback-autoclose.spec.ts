import { test, expect } from "../fixtures/test";
import { resetWorld, TENANT, TICKET, THREAD_TOKEN, prisma } from "../fixtures/world";
import { openAnonymousPage } from "../support/anon";
import { TEXT } from "../support/texts";

/**
 * Feedback do cliente após o encerramento e auto-close por prazo.
 * Todos acontecem pelo link público (sem sessão).
 */
test.describe("Feedback do cliente e auto-close", () => {
  test.beforeEach(async () => {
    await resetWorld();
  });

  test("cliente confirma que resolveu: chamado vira resolvido (client_confirmed)", async ({ browser }) => {
    const { context, page } = await openAnonymousPage(browser);
    await page.goto(`/${TENANT.demo.slug}/thread/${THREAD_TOKEN.pending}`);

    await expect(page.getByRole("heading", { name: TEXT.feedbackTitle })).toBeVisible();
    await page.getByRole("button", { name: "Sim, resolvido", exact: true }).click();

    await expect(page.getByText(TEXT.feedbackThanks)).toBeVisible();
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: TICKET.pending.id } });
    expect(ticket.status).toBe("resolved");
    expect(ticket.closedReason).toBe("client_confirmed");

    await context.close();
  });

  test("cliente diz que não resolveu: chamado vira fechado (client_unresolved)", async ({ browser }) => {
    const { context, page } = await openAnonymousPage(browser);
    await page.goto(`/${TENANT.demo.slug}/thread/${THREAD_TOKEN.pending}`);

    await page.getByRole("button", { name: "Não, ainda preciso de ajuda", exact: true }).click();

    await expect(page.getByText(TEXT.feedbackThanks)).toBeVisible();
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: TICKET.pending.id } });
    expect(ticket.status).toBe("closed");
    expect(ticket.closedReason).toBe("client_unresolved");

    await context.close();
  });

  test("prazo de feedback expirado fecha automaticamente como resolvido (auto_closed)", async ({ browser }) => {
    const { context, page } = await openAnonymousPage(browser);
    // Deadline no passado: o check-on-access fecha ao abrir a thread.
    await page.goto(`/${TENANT.demo.slug}/thread/${THREAD_TOKEN.expired}`);

    await expect(page.getByRole("button", { name: "Sim, resolvido", exact: true })).toHaveCount(0);

    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: TICKET.expired.id } });
    expect(ticket.status).toBe("resolved");
    expect(ticket.closedReason).toBe("auto_closed");

    await context.close();
  });
});
