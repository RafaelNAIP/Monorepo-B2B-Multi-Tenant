import { describe, expect, it } from "vitest";

import { attachmentKeysSchema, presignRequestSchema } from "@/lib/attachments/schemas";
import { MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD } from "@/lib/storage/constants";

const validFile = { name: "print.png", type: "image/png", size: 1024 };

describe("presignRequestSchema", () => {
  it("aceita um arquivo válido", () => {
    expect(presignRequestSchema.safeParse({ files: [validFile] }).success).toBe(true);
  });

  it("aceita ticketId e threadToken opcionais", () => {
    const r = presignRequestSchema.safeParse({ files: [validFile], ticketId: "abc", threadToken: "tok" });
    expect(r.success).toBe(true);
  });

  it("rejeita lista vazia de arquivos", () => {
    const r = presignRequestSchema.safeParse({ files: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.files?.[0]).toBe("Selecione ao menos um arquivo");
  });

  it("aceita exatamente o máximo de arquivos e rejeita um a mais", () => {
    const ok = Array.from({ length: MAX_FILES_PER_UPLOAD }, () => validFile);
    const tooMany = [...ok, validFile];
    expect(presignRequestSchema.safeParse({ files: ok }).success).toBe(true);
    const r = presignRequestSchema.safeParse({ files: tooMany });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.files?.[0]).toBe("Máximo de 5 arquivos por envio");
  });

  it("aceita arquivo com exatamente 10MB e rejeita 1 byte a mais", () => {
    expect(presignRequestSchema.safeParse({ files: [{ ...validFile, size: MAX_FILE_SIZE }] }).success).toBe(true);
    expect(presignRequestSchema.safeParse({ files: [{ ...validFile, size: MAX_FILE_SIZE + 1 }] }).success).toBe(false);
  });

  it("rejeita arquivo vazio, tamanho negativo ou fracionado", () => {
    for (const size of [0, -1, 10.5]) {
      expect(presignRequestSchema.safeParse({ files: [{ ...validFile, size }] }).success).toBe(false);
    }
  });

  it("rejeita mime type não permitido com mensagem em português", () => {
    const r = presignRequestSchema.safeParse({ files: [{ ...validFile, type: "application/x-msdownload" }] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(JSON.stringify(r.error.flatten())).toContain("Tipo de arquivo não suportado");
    }
  });

  it.each([
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ])("aceita o mime type %s", (type) => {
    expect(presignRequestSchema.safeParse({ files: [{ ...validFile, type }] }).success).toBe(true);
  });

  it("rejeita nome vazio e nome acima de 255 caracteres", () => {
    expect(presignRequestSchema.safeParse({ files: [{ ...validFile, name: "" }] }).success).toBe(false);
    expect(presignRequestSchema.safeParse({ files: [{ ...validFile, name: "a".repeat(256) }] }).success).toBe(false);
  });

  it("remove espaços nas pontas do nome", () => {
    const r = presignRequestSchema.safeParse({ files: [{ ...validFile, name: "  print.png  " }] });
    expect(r.success && r.data.files[0].name).toBe("print.png");
  });
});

describe("attachmentKeysSchema", () => {
  it("aceita lista de keys válidas", () => {
    expect(attachmentKeysSchema.safeParse(["t/n/a.png", "t/n/b.pdf"]).success).toBe(true);
  });

  it("aceita lista vazia", () => {
    expect(attachmentKeysSchema.safeParse([]).success).toBe(true);
  });

  it("rejeita mais de 5 keys", () => {
    const keys = Array.from({ length: 6 }, (_, i) => `t/n/${i}.png`);
    expect(attachmentKeysSchema.safeParse(keys).success).toBe(false);
  });

  it("rejeita keys duplicadas (evita associar o mesmo arquivo duas vezes)", () => {
    const r = attachmentKeysSchema.safeParse(["t/n/a.png", "t/n/a.png"]);
    expect(r.success).toBe(false);
  });

  it("rejeita key vazia", () => {
    expect(attachmentKeysSchema.safeParse([""]).success).toBe(false);
  });
});
