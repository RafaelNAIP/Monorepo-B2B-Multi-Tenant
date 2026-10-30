import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

const getSessionMock = vi.fn();
vi.mock("@empresa/auth", () => ({ getSession: () => getSessionMock() }));

const presignMock = vi.fn();
vi.mock("@/lib/storage/presign", () => ({
  getPresignedUploadUrl: (...args: unknown[]) => presignMock(...args),
}));

const getMissingR2VarsMock = vi.fn<() => string[]>(() => []);
vi.mock("@/lib/storage/client", () => ({
  getMissingR2Vars: () => getMissingR2VarsMock(),
  isR2Configured: () => getMissingR2VarsMock().length === 0,
}));

import { POST } from "@/app/api/upload/presign/route";

const TENANT_A = "507f1f77bcf86cd799439011";
const TENANT_B = "507f1f77bcf86cd799439022";
const TICKET = "507f191e810c19729de860ea";

const session = (tenantId = TENANT_A) => ({
  sub: "u1",
  email: "maria@demo.com",
  name: "Maria",
  tenantId,
  tenantSlug: "demo",
  role: "client" as const,
});

const png = { name: "print.png", type: "image/png", size: 2048 };

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  resetPrismaMocks();
  getSessionMock.mockReset();
  presignMock.mockReset();
  getMissingR2VarsMock.mockReset();
  getMissingR2VarsMock.mockReturnValue([]);
  presignMock.mockImplementation(async ({ fileKey }: { fileKey: string }) => `https://r2.test/${fileKey}?sig=x`);
  prismaMock.attachment.create.mockImplementation(async ({ data }: { data: object }) => ({ id: "a1", ...data }));
});

describe("POST /api/upload/presign — R2 não configurado", () => {
  it("retorna 503 listando as variáveis ausentes", async () => {
    getMissingR2VarsMock.mockReturnValue(["R2_ENDPOINT", "R2_BUCKET_NAME"]);
    const res = await post({ files: [png] });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("R2_ENDPOINT");
    expect(body.error).toContain("R2_BUCKET_NAME");
    expect(presignMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/upload/presign — autenticação", () => {
  it("retorna 401 sem sessão e sem token de thread", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await post({ files: [png] });
    expect(res.status).toBe(401);
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
    expect(presignMock).not.toHaveBeenCalled();
  });

  it("retorna 401 para token de thread inexistente", async () => {
    getSessionMock.mockResolvedValue(null);
    prismaMock.threadAccess.findFirst.mockResolvedValue(null);
    const res = await post({ files: [png], threadToken: "invalido" });
    expect(res.status).toBe(401);
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/upload/presign — validação", () => {
  beforeEach(() => getSessionMock.mockResolvedValue(session()));

  it("retorna 400 para JSON malformado", async () => {
    const res = await post("{nao-e-json", true);
    expect(res.status).toBe(400);
  });

  it("retorna 400 com fieldErrors para tipo de arquivo não permitido", async () => {
    const res = await post({ files: [{ name: "virus.exe", type: "application/x-msdownload", size: 10 }] });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(JSON.stringify(json.fieldErrors)).toContain("Tipo de arquivo não suportado");
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
  });

  it("retorna 400 para mais de 5 arquivos", async () => {
    const res = await post({ files: Array.from({ length: 6 }, () => png) });
    expect(res.status).toBe(400);
  });

  it("retorna 400 para arquivo acima de 10MB", async () => {
    const res = await post({ files: [{ ...png, size: 10 * 1024 * 1024 + 1 }] });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/upload/presign — chamado novo (sessão)", () => {
  beforeEach(() => getSessionMock.mockResolvedValue(session()));

  it("usa o tenant da sessão e ignora tenantId enviado no body", async () => {
    const res = await post({ files: [png], tenantId: TENANT_B });
    expect(res.status).toBe(200);
    const created = prismaMock.attachment.create.mock.calls[0][0].data;
    expect(created.tenantId).toBe(TENANT_A);
    expect(created.fileKey.startsWith(`${TENANT_A}/novo/`)).toBe(true);
  });

  it("cria um Attachment pending por arquivo, com metadados do arquivo", async () => {
    const jpg = { name: "foto.jpg", type: "image/jpeg", size: 5000 };
    await post({ files: [png, jpg] });
    expect(prismaMock.attachment.create).toHaveBeenCalledTimes(2);
    const [a, b] = prismaMock.attachment.create.mock.calls.map((c) => c[0].data);
    expect(a).toMatchObject({ fileName: "print.png", mimeType: "image/png", fileSize: 2048, status: "pending" });
    expect(b).toMatchObject({ fileName: "foto.jpg", mimeType: "image/jpeg", fileSize: 5000, status: "pending" });
    expect(a.fileKey).not.toBe(b.fileKey);
  });

  it("devolve fileKey idêntico ao salvo e URL assinada com tipo e tamanho do arquivo", async () => {
    const res = await post({ files: [png] });
    const json = await res.json();
    const saved = prismaMock.attachment.create.mock.calls[0][0].data;
    expect(json.uploads).toHaveLength(1);
    expect(json.uploads[0].fileKey).toBe(saved.fileKey);
    expect(json.uploads[0].uploadUrl).toBe(`https://r2.test/${saved.fileKey}?sig=x`);
    expect(json.uploads[0].expiresIn).toBe(600);
    expect(json.uploads[0].name).toBe("print.png");
    expect(presignMock).toHaveBeenCalledWith({
      fileKey: saved.fileKey,
      contentType: "image/png",
      contentLength: 2048,
    });
  });

  it("não deixa registro órfão quando a assinatura falha", async () => {
    presignMock.mockRejectedValue(new Error("R2_ENDPOINT não configurada"));
    const res = await post({ files: [png] });
    expect(res.status).toBe(500);
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/upload/presign — chamado existente (sessão)", () => {
  beforeEach(() => getSessionMock.mockResolvedValue(session()));

  it("retorna 404 quando o chamado não pertence ao tenant da sessão", async () => {
    prismaMock.ticket.findFirst.mockResolvedValue(null);
    const res = await post({ files: [png], ticketId: TICKET });
    expect(res.status).toBe(404);
    expect(prismaMock.ticket.findFirst.mock.calls[0][0].where).toEqual({ id: TICKET, tenantId: TENANT_A });
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
  });

  it("inclui o ticketId na chave e no registro quando o chamado é do tenant", async () => {
    prismaMock.ticket.findFirst.mockResolvedValue({ id: TICKET, tenantId: TENANT_A });
    const res = await post({ files: [png], ticketId: TICKET });
    expect(res.status).toBe(200);
    const created = prismaMock.attachment.create.mock.calls[0][0].data;
    expect(created.fileKey.startsWith(`${TENANT_A}/${TICKET}/`)).toBe(true);
    expect(created.ticketId).toBe(TICKET);
  });
});

describe("POST /api/upload/presign — cliente da thread pública (token)", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(null);
    prismaMock.threadAccess.findFirst.mockResolvedValue({ token: "tok", ticketId: TICKET, tenantId: TENANT_A });
  });

  it("deriva tenant e chamado do token, ignorando ticketId do body", async () => {
    const res = await post({ files: [png], threadToken: "tok", ticketId: "outro-ticket" });
    expect(res.status).toBe(200);
    const created = prismaMock.attachment.create.mock.calls[0][0].data;
    expect(created.tenantId).toBe(TENANT_A);
    expect(created.ticketId).toBe(TICKET);
    expect(created.fileKey.startsWith(`${TENANT_A}/${TICKET}/`)).toBe(true);
  });
});
