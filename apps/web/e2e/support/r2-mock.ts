import type { Page } from "@playwright/test";

/**
 * Intercepta o PUT pré-assinado no Cloudflare R2 e responde 200 com CORS.
 * A assinatura do presign continua sendo gerada pelo app (só o transporte é mockado).
 */
export async function mockR2Upload(page: Page): Promise<void> {
  const headers = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "PUT, GET, HEAD, OPTIONS",
    "access-control-allow-headers": "*",
  };
  await page.route(/r2\.cloudflarestorage\.com/, (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers });
    }
    return route.fulfill({ status: 200, headers, body: "" });
  });
}

/** PNG 1x1 válido, usado como anexo nos specs. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);
