import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

const getSessionMock = vi.fn();
vi.mock("@empresa/auth", () => ({ getSession: () => getSessionMock() }));

const presignDownloadMock = vi.fn();
vi.mock("@/lib/storage/presign", () => ({
  getPresignedDownloadUrl: (...args: unknown[]) => presignDownloadMock(...args),
}));

import { GET } from "@/app/api/upload/download/[...fileKey]/route";

const TENANT_A = "507f1f77bcf86cd799439011";
const TENANT_B = "507f1f77bcf86cd799439022";
const TICKET = "507f191e810c19729de860ea";
const OTHER_TICKET = "507f191e810c19729de860eb";
const KEY_A = `${TENANT_A}/${TICKET}/a1b2c3d4-0000-4000-8000-000000000000.png`;

const session = (tenantId: string, role: "admin" | "client" = "admin") => ({
  sub: "u1",
  email: "joao@demo.com",
  name: "João",
  tenantId,
  tenantSlug: "demo",
  role,
});

const attachment = (overrides = {}) => ({
  id: "a1",
  tenantId: TENANT_A,
  ticketId: TICKET,
  fileKey: KEY_A,
  fileName: "print.png",
  status: "completed",
  ...overrides,
});

function get(fileKey: string, query = "") {
  return GET(new Request(`http://localhost/api/upload/download/${fileKey}${query}`), {
    params: Promise.resolve({ fileKey: fileKey.split("/") }),
  });
}

beforeEach(() => {
  resetPrismaMocks();
  getSessionMock.mockReset();
  presignDownloadMock.mockReset();
  presignDownloadMock.mockResolvedValue("https://r2.test/signed-download");
});

describe("GET /api/upload/download — autenticação", () => {
  it("retorna 401 sem sessão e sem token", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await get(KEY_A);
    expect(res.status).toBe(401);
    expect(presignDownloadMock).not.toHaveBeenCalled();
  });

  it("retorna 401 para token de thread inexistente", async () => {
    getSessionMock.mockResolvedValue(null);
    prismaMock.threadAccess.findFirst.mockResolvedValue(null);
    const res = await get(KEY_A, "?token=invalido");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/upload/download — sessão", () => {
  beforeEach(() => getSessionMock.mockResolvedValue(session(TENANT_A)));

  it("redireciona 302 para a URL assinada com o nome original do arquivo", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(attachment());
    const res = await get(KEY_A);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://r2.test/signed-download");
    expect(presignDownloadMock).toHaveBeenCalledWith({ fileKey: KEY_A, fileName: "print.png" });
  });

  it("não permite cache do redirect (a URL assinada expira)", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(attachment());
    const res = await get(KEY_A);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("consulta o anexo restrito ao tenant da sessão", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(attachment());
    await get(KEY_A);
    expect(prismaMock.attachment.findFirst.mock.calls[0][0].where).toMatchObject({
      fileKey: KEY_A,
      tenantId: TENANT_A,
      status: "completed",
    });
  });

  it("retorna 404 quando o anexo não existe ou não está completed", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(null);
    const res = await get(KEY_A);
    expect(res.status).toBe(404);
    expect(presignDownloadMock).not.toHaveBeenCalled();
  });

  it("retorna 404 sem consultar o banco quando a chave pertence a outro tenant", async () => {
    getSessionMock.mockResolvedValue(session(TENANT_B));
    // Mesmo que o banco devolvesse o anexo, a chave do tenant A não pode ser servida ao tenant B
    prismaMock.attachment.findFirst.mockResolvedValue(attachment());
    const res = await get(KEY_A);
    expect(res.status).toBe(404);
    expect(prismaMock.attachment.findFirst).not.toHaveBeenCalled();
    expect(presignDownloadMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/upload/download — cliente da thread pública (token)", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(null);
    prismaMock.threadAccess.findFirst.mockResolvedValue({ token: "tok", ticketId: TICKET, tenantId: TENANT_A });
  });

  it("serve anexo do chamado da thread", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(attachment());
    const res = await get(KEY_A, "?token=tok");
    expect(res.status).toBe(302);
  });

  it("retorna 404 para anexo de outro chamado do mesmo tenant", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(attachment({ ticketId: OTHER_TICKET }));
    const res = await get(KEY_A, "?token=tok");
    expect(res.status).toBe(404);
    expect(presignDownloadMock).not.toHaveBeenCalled();
  });
});
