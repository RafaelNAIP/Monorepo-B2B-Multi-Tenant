import { describe, expect, it } from "vitest";

import { buildFileKey, getTenantIdFromKey } from "@/lib/storage/keys";

const TENANT = "507f1f77bcf86cd799439011";
const TICKET = "507f191e810c19729de860ea";

describe("buildFileKey", () => {
  it("monta o caminho {tenantId}/{ticketId}/{uuid}.{ext}", () => {
    const key = buildFileKey({ tenantId: TENANT, ticketId: TICKET, mimeType: "image/png" });
    expect(key).toMatch(new RegExp(`^${TENANT}/${TICKET}/[0-9a-f-]{36}\\.png$`));
  });

  it("usa o segmento 'novo' quando o chamado ainda não existe", () => {
    const key = buildFileKey({ tenantId: TENANT, mimeType: "application/pdf" });
    expect(key).toMatch(new RegExp(`^${TENANT}/novo/[0-9a-f-]{36}\\.pdf$`));
  });

  it("deriva a extensão do mime type e não do nome do arquivo", () => {
    const jpeg = buildFileKey({ tenantId: TENANT, mimeType: "image/jpeg" });
    const docx = buildFileKey({
      tenantId: TENANT,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(jpeg.endsWith(".jpg")).toBe(true);
    expect(docx.endsWith(".docx")).toBe(true);
  });

  it("gera chaves diferentes a cada chamada", () => {
    const a = buildFileKey({ tenantId: TENANT, mimeType: "image/png" });
    const b = buildFileKey({ tenantId: TENANT, mimeType: "image/png" });
    expect(a).not.toBe(b);
  });

  it("lança erro para mime type não permitido", () => {
    expect(() => buildFileKey({ tenantId: TENANT, mimeType: "application/x-msdownload" })).toThrow(
      /não permitido/i
    );
  });

  it("rejeita tenantId ou ticketId com caracteres de path traversal", () => {
    expect(() => buildFileKey({ tenantId: "../outro", mimeType: "image/png" })).toThrow();
    expect(() =>
      buildFileKey({ tenantId: TENANT, ticketId: "a/../b", mimeType: "image/png" })
    ).toThrow();
  });
});

describe("getTenantIdFromKey", () => {
  it("extrai o tenantId do primeiro segmento", () => {
    expect(getTenantIdFromKey(`${TENANT}/${TICKET}/abc.png`)).toBe(TENANT);
  });

  it("retorna null para chave sem estrutura esperada", () => {
    expect(getTenantIdFromKey("arquivo-solto.png")).toBeNull();
    expect(getTenantIdFromKey("")).toBeNull();
  });
});
