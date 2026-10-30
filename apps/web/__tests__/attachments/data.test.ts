import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

const deleteFileMock = vi.fn();
vi.mock("@/lib/storage/delete", () => ({ deleteFile: (...args: unknown[]) => deleteFileMock(...args) }));

import {
  attachToMessage,
  attachToTicket,
  createAttachment,
  deleteAttachment,
  getAttachmentByKey,
  getAttachmentsByTicket,
} from "@/lib/attachments/data";

const TENANT_A = "507f1f77bcf86cd799439011";
const TENANT_B = "507f1f77bcf86cd799439022";

beforeEach(() => {
  resetPrismaMocks();
  deleteFileMock.mockReset();
});

describe("createAttachment", () => {
  it("cria o registro sempre com status pending", async () => {
    prismaMock.attachment.create.mockResolvedValue({ id: "1" });
    await createAttachment({
      tenantId: TENANT_A,
      fileKey: "k",
      fileName: "a.png",
      fileSize: 10,
      mimeType: "image/png",
    });
    const arg = prismaMock.attachment.create.mock.calls[0][0];
    expect(arg.data.status).toBe("pending");
    expect(arg.data.tenantId).toBe(TENANT_A);
    expect(arg.data.fileKey).toBe("k");
  });

  it("não envia ticketId quando o chamado ainda não existe", async () => {
    prismaMock.attachment.create.mockResolvedValue({ id: "1" });
    await createAttachment({ tenantId: TENANT_A, fileKey: "k", fileName: "a", fileSize: 1, mimeType: "image/png" });
    expect(prismaMock.attachment.create.mock.calls[0][0].data.ticketId).toBeUndefined();
  });
});

describe("attachToTicket", () => {
  it("só associa anexos pending, do mesmo tenant, ainda sem dono", async () => {
    prismaMock.attachment.updateMany.mockResolvedValue({ count: 2 });
    await attachToTicket({ keys: ["k1", "k2"], ticketId: "T1", tenantId: TENANT_A });
    const arg = prismaMock.attachment.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({
      fileKey: { in: ["k1", "k2"] },
      tenantId: TENANT_A,
      status: "pending",
      ticketId: null,
      messageId: null,
    });
    expect(arg.data).toEqual({ ticketId: "T1", status: "completed" });
  });

  it("retorna a quantidade de anexos realmente associados", async () => {
    prismaMock.attachment.updateMany.mockResolvedValue({ count: 1 });
    await expect(attachToTicket({ keys: ["k1", "k2"], ticketId: "T1", tenantId: TENANT_A })).resolves.toBe(1);
  });

  it("não consulta o banco quando não há keys", async () => {
    await expect(attachToTicket({ keys: [], ticketId: "T1", tenantId: TENANT_A })).resolves.toBe(0);
    expect(prismaMock.attachment.updateMany).not.toHaveBeenCalled();
  });
});

describe("attachToMessage", () => {
  it("associa à mensagem e ao ticket da mesma thread", async () => {
    prismaMock.attachment.updateMany.mockResolvedValue({ count: 1 });
    await attachToMessage({ keys: ["k1"], messageId: "M1", ticketId: "T1", tenantId: TENANT_A });
    const arg = prismaMock.attachment.updateMany.mock.calls[0][0];
    expect(arg.where.tenantId).toBe(TENANT_A);
    expect(arg.where.status).toBe("pending");
    expect(arg.data).toEqual({ messageId: "M1", ticketId: "T1", status: "completed" });
  });
});

describe("getAttachmentsByTicket", () => {
  it("filtra por tenant, só completed e exclui anexos de mensagens (são do chamado em si)", async () => {
    prismaMock.attachment.findMany.mockResolvedValue([]);
    await getAttachmentsByTicket("T1", TENANT_A);
    const arg = prismaMock.attachment.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ ticketId: "T1", tenantId: TENANT_A, status: "completed", messageId: null });
    expect(arg.orderBy).toEqual({ createdAt: "asc" });
  });
});

describe("getAttachmentByKey", () => {
  it("só retorna anexo completed do tenant informado", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(null);
    const r = await getAttachmentByKey("k", TENANT_B);
    expect(r).toBeNull();
    expect(prismaMock.attachment.findFirst.mock.calls[0][0].where).toEqual({
      fileKey: "k",
      tenantId: TENANT_B,
      status: "completed",
    });
  });
});

describe("deleteAttachment", () => {
  it("remove o arquivo do R2 e depois o registro", async () => {
    const order: string[] = [];
    prismaMock.attachment.findFirst.mockResolvedValue({ id: "A1", fileKey: "k", tenantId: TENANT_A });
    deleteFileMock.mockImplementation(async () => void order.push("r2"));
    prismaMock.attachment.delete.mockImplementation(async () => void order.push("db"));
    await deleteAttachment("A1", TENANT_A);
    expect(order).toEqual(["r2", "db"]);
    expect(deleteFileMock).toHaveBeenCalledWith("k");
  });

  it("mantém o registro se a remoção no R2 falhar", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue({ id: "A1", fileKey: "k", tenantId: TENANT_A });
    deleteFileMock.mockRejectedValue(new Error("R2 indisponível"));
    await expect(deleteAttachment("A1", TENANT_A)).rejects.toThrow("R2 indisponível");
    expect(prismaMock.attachment.delete).not.toHaveBeenCalled();
  });

  it("não remove nada de anexo de outro tenant", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(null);
    await expect(deleteAttachment("A1", TENANT_B)).resolves.toBe(false);
    expect(deleteFileMock).not.toHaveBeenCalled();
    expect(prismaMock.attachment.findFirst.mock.calls[0][0].where).toEqual({ id: "A1", tenantId: TENANT_B });
  });
});
