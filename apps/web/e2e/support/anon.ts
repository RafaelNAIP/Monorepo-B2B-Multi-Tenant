import type { Browser, BrowserContext, Page } from "@playwright/test";

import { nextClientIp } from "../fixtures/test";

/** Contexto sem cookie de sessão (visitante ou cliente pelo link público). */
export async function openAnonymousPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": nextClientIp() },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const page = await context.newPage();
  return { context, page };
}
