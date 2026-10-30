import { beforeEach, describe, expect, it } from "vitest";

import { getPresignedDownloadUrl, getPresignedUploadUrl } from "@/lib/storage/presign";

// Assinatura SigV4 é calculada localmente: estes testes usam o SDK real, sem rede.
const FILE_KEY = "507f1f77bcf86cd799439011/novo/a1b2c3d4-0000-4000-8000-000000000000.png";

beforeEach(() => {
  process.env.R2_ACCESS_KEY_ID = "test-access-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.R2_BUCKET_NAME = "empresa-uploads";
  process.env.R2_ENDPOINT = "https://conta123.r2.cloudflarestorage.com";
});

describe("getPresignedUploadUrl", () => {
  it("aponta para o endpoint R2, bucket e fileKey informados", async () => {
    const url = new URL(
      await getPresignedUploadUrl({ fileKey: FILE_KEY, contentType: "image/png", contentLength: 1024 })
    );
    expect(url.host).toBe("conta123.r2.cloudflarestorage.com");
    expect(url.pathname).toBe(`/empresa-uploads/${FILE_KEY}`);
  });

  it("expira em 600 segundos e contém assinatura", async () => {
    const url = new URL(
      await getPresignedUploadUrl({ fileKey: FILE_KEY, contentType: "image/png", contentLength: 1024 })
    );
    expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("assina content-type e content-length para o R2 rejeitar upload divergente", async () => {
    const url = new URL(
      await getPresignedUploadUrl({ fileKey: FILE_KEY, contentType: "image/png", contentLength: 1024 })
    );
    const signed = url.searchParams.get("X-Amz-SignedHeaders") ?? "";
    expect(signed).toContain("content-type");
    expect(signed).toContain("content-length");
  });

  it("gera assinaturas diferentes quando o tamanho declarado muda", async () => {
    const a = new URL(
      await getPresignedUploadUrl({ fileKey: FILE_KEY, contentType: "image/png", contentLength: 1024 })
    );
    const b = new URL(
      await getPresignedUploadUrl({ fileKey: FILE_KEY, contentType: "image/png", contentLength: 2048 })
    );
    expect(a.searchParams.get("X-Amz-Signature")).not.toBe(b.searchParams.get("X-Amz-Signature"));
  });

  it("lança erro claro quando a configuração do R2 está incompleta", async () => {
    delete process.env.R2_SECRET_ACCESS_KEY;
    await expect(
      getPresignedUploadUrl({ fileKey: FILE_KEY, contentType: "image/png", contentLength: 1 })
    ).rejects.toThrow(/R2_SECRET_ACCESS_KEY/);
  });
});

describe("getPresignedDownloadUrl", () => {
  it("expira em 3600 segundos", async () => {
    const url = new URL(await getPresignedDownloadUrl({ fileKey: FILE_KEY, fileName: "foto.png" }));
    expect(url.searchParams.get("X-Amz-Expires")).toBe("3600");
    expect(url.pathname).toBe(`/empresa-uploads/${FILE_KEY}`);
  });

  it("força Content-Disposition com o nome original do arquivo", async () => {
    const url = new URL(await getPresignedDownloadUrl({ fileKey: FILE_KEY, fileName: "relatório final.pdf" }));
    const disposition = url.searchParams.get("response-content-disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(encodeURIComponent("relatório final.pdf"));
  });

  it("neutraliza aspas e quebras de linha no nome do arquivo", async () => {
    const url = new URL(
      await getPresignedDownloadUrl({ fileKey: FILE_KEY, fileName: 'a"b\r\nSet-Cookie: x.png' })
    );
    const disposition = url.searchParams.get("response-content-disposition") ?? "";
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition.match(/"/g)?.length ?? 0).toBeLessThanOrEqual(2);
  });
});
