import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@empresa/auth", () => ({ getSession: vi.fn() }));

const cleanupMock = vi.fn();
vi.mock("@/lib/attachments/cleanup", () => ({
  cleanupOrphanAttachments: () => cleanupMock(),
}));

import { GET } from "@/app/api/attachments/cleanup/route";

const SECRET = "segredo-de-teste-com-32-chars-ou-mais";

function cronRequest(authorization?: string) {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request("http://localhost/api/attachments/cleanup", { headers });
}

beforeEach(() => {
  cleanupMock.mockReset();
  cleanupMock.mockResolvedValue({ deleted: 2, errors: 0 });
  vi.stubEnv("CRON_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/attachments/cleanup (Vercel Cron)", () => {
  it("executa a limpeza com Bearer CRON_SECRET correto", async () => {
    const res = await GET(cronRequest(`Bearer ${SECRET}`));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 2, errors: 0 });
    expect(cleanupMock).toHaveBeenCalledOnce();
  });

  it("retorna 403 sem header Authorization", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(403);
    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("retorna 403 com segredo errado", async () => {
    const res = await GET(cronRequest("Bearer chute-errado"));
    expect(res.status).toBe(403);
    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("retorna 403 quando CRON_SECRET não está configurado (nunca aberto por padrão)", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(cronRequest("Bearer "));
    expect(res.status).toBe(403);
    expect(cleanupMock).not.toHaveBeenCalled();
  });
});
