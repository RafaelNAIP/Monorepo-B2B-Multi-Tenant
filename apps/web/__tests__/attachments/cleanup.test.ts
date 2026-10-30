import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMocks } from "../helpers/mock-prisma";

vi.mock("@empresa/db", () => ({ prisma: prismaMock }));

const deleteFileMock = vi.fn<(key: string) => Promise<void>>();
vi.mock("@/lib/storage/delete", () => ({
  deleteFile: (key: string) => deleteFileMock(key),
}));

import { cleanupOrphanAttachments, ORPHAN_THRESHOLD_MS } from "@/lib/attachments/cleanup";

beforeEach(() => {
  resetPrismaMocks();
  deleteFileMock.mockReset();
  deleteFileMock.mockResolvedValue(undefined);
});

describe("cleanupOrphanAttachments", () => {
  it("deleta anexos pending criados há mais de 1 hora", async () => {
    const orphans = [
      { id: "a1", fileKey: "t/novo/old1.png" },
      { id: "a2", fileKey: "t/novo/old2.jpg" },
    ];
    prismaMock.attachment.findMany.mockResolvedValue(orphans);
    prismaMock.attachment.deleteMany.mockResolvedValue({ count: 2 });

    const result = await cleanupOrphanAttachments();

    // Consulta filtra por status pending e data antiga
    const query = prismaMock.attachment.findMany.mock.calls[0][0];
    expect(query.where.status).toBe("pending");
    expect(query.where.createdAt.lt).toBeInstanceOf(Date);

    // Deleta do R2 primeiro
    expect(deleteFileMock).toHaveBeenCalledWith("t/novo/old1.png");
    expect(deleteFileMock).toHaveBeenCalledWith("t/novo/old2.jpg");

    // Depois remove do banco
    expect(prismaMock.attachment.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["a1", "a2"] } },
    });

    expect(result).toEqual({ deleted: 2, errors: 0 });
  });

  it("retorna zerado quando não há órfãos", async () => {
    prismaMock.attachment.findMany.mockResolvedValue([]);
    const result = await cleanupOrphanAttachments();
    expect(result).toEqual({ deleted: 0, errors: 0 });
    expect(deleteFileMock).not.toHaveBeenCalled();
    expect(prismaMock.attachment.deleteMany).not.toHaveBeenCalled();
  });

  it("conta erros de R2 sem interromper a limpeza dos demais", async () => {
    const orphans = [
      { id: "a1", fileKey: "t/novo/ok.png" },
      { id: "a2", fileKey: "t/novo/falha.png" },
    ];
    prismaMock.attachment.findMany.mockResolvedValue(orphans);
    prismaMock.attachment.deleteMany.mockResolvedValue({ count: 1 });

    deleteFileMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("R2 error"));

    const result = await cleanupOrphanAttachments();

    // Só deleta do banco os que foram removidos do R2
    expect(prismaMock.attachment.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["a1"] } },
    });
    expect(result).toEqual({ deleted: 1, errors: 1 });
  });

  it("usa threshold de 1 hora por padrão", () => {
    expect(ORPHAN_THRESHOLD_MS).toBe(60 * 60 * 1000);
  });
});
