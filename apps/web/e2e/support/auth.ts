import type { Page } from "@playwright/test";

import { DEFAULT_PASSWORD } from "../fixtures/world";

export type LoginRole = "Cliente" | "Administrador";

/** Faz login pela tela real (/{tenant}/auth) e aguarda o redirecionamento. */
export async function loginViaUi(
  page: Page,
  options: { tenant: string; email: string; role: LoginRole; password?: string; expectPath: string }
): Promise<void> {
  await page.goto(`/${options.tenant}/auth`);
  await page.getByLabel(options.role, { exact: true }).check();
  await page.getByLabel("E-mail").fill(options.email);
  await page.getByLabel("Senha").fill(options.password ?? DEFAULT_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === options.expectPath);
}
