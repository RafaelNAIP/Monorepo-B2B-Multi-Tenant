import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
vi.mock("@empresa/auth", () => ({ getSession: () => getSessionMock() }));

const cleanupMock = vi.fn();
vi.mock("@/lib/attachments/cleanup", () => ({
  cleanupOrphanAttachments: () => cleanupMock(),
}));

import { POST } from "@/app/api/attachments/cleanup/route";

const adminSession = {
  sub: "u1",
  email: "admin@demo.com",
  name: "Admin",
  tenantId: "t1",
  tenantSlug: "demo",
  role: "admin" as const,
};

const clientSession = { ...adminSession, role: "client" as const };

function post() {
  return POST();
}

beforeEach(() => {
  getSessionMock.mockReset();
  cleanupMock.mockReset();
});

describe("POST /api/attachments/cleanup", () => {
  it("retorna 403 sem sessão", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(403);
    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("retorna 403 para cliente (não admin)", async () => {
    getSessionMock.mockResolvedValue(clientSession);
    const res = await post();
    expect(res.status).toBe(403);
    expect(cleanupMock).not.toHaveBeenCalled();
  });

  it("executa a limpeza e retorna o resultado para admin", async () => {
    getSessionMock.mockResolvedValue(adminSession);
    cleanupMock.mockResolvedValue({ deleted: 3, errors: 1 });
    const res = await post();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ deleted: 3, errors: 1 });
    expect(cleanupMock).toHaveBeenCalledOnce();
  });
});
