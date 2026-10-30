import { describe, expect, it, vi } from "vitest";

import {
  buildDownloadUrl,
  formatFileSize,
  isImageMime,
  uploadFiles,
  validateSelection,
  type UploadProgress,
} from "@/lib/attachments/client";

const file = (name: string, type: string, size: number) =>
  ({ name, type, size }) as File;

describe("validateSelection", () => {
  it("aceita apenas imagens dentro dos limites", () => {
    const r = validateSelection(0, [file("a.png", "image/png", 100), file("b.jpg", "image/jpeg", 200)]);
    expect(r.accepted.map((f) => f.name)).toEqual(["a.png", "b.jpg"]);
    expect(r.errors).toEqual([]);
  });

  it("rejeita pdf e docx como tipos não suportados", () => {
    const r = validateSelection(0, [
      file("doc.pdf", "application/pdf", 100),
      file("doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 100),
    ]);
    expect(r.accepted).toEqual([]);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toContain("tipo de arquivo não suportado");
    expect(r.errors[1]).toContain("tipo de arquivo não suportado");
  });

  it("aceita webp como imagem válida", () => {
    const r = validateSelection(0, [file("foto.webp", "image/webp", 100)]);
    expect(r.accepted.map((f) => f.name)).toEqual(["foto.webp"]);
    expect(r.errors).toEqual([]);
  });

  it("rejeita tipo não permitido informando o nome do arquivo", () => {
    const r = validateSelection(0, [file("virus.exe", "application/x-msdownload", 100)]);
    expect(r.accepted).toEqual([]);
    expect(r.errors).toEqual(['"virus.exe": tipo de arquivo não suportado']);
  });

  it("rejeita arquivo acima de 10MB e aceita exatamente 10MB", () => {
    const limit = 10 * 1024 * 1024;
    const r = validateSelection(0, [file("ok.png", "image/png", limit), file("grande.png", "image/png", limit + 1)]);
    expect(r.accepted.map((f) => f.name)).toEqual(["ok.png"]);
    expect(r.errors).toEqual(['"grande.png": arquivo maior que 10 MB']);
  });

  it("rejeita arquivo vazio", () => {
    const r = validateSelection(0, [file("vazio.png", "image/png", 0)]);
    expect(r.errors).toEqual(['"vazio.png": arquivo vazio']);
  });

  it("respeita o limite de 5 considerando os já selecionados", () => {
    const incoming = [1, 2, 3].map((i) => file(`n${i}.png`, "image/png", 10));
    const r = validateSelection(3, incoming);
    expect(r.accepted.map((f) => f.name)).toEqual(["n1.png", "n2.png"]);
    expect(r.errors).toEqual(['"n3.png": máximo de 5 arquivos por envio']);
  });

  it("não aceita nada quando já está no limite", () => {
    const r = validateSelection(5, [file("a.png", "image/png", 10)]);
    expect(r.accepted).toEqual([]);
    expect(r.errors).toHaveLength(1);
  });
});

describe("uploadFiles", () => {
  const png = new File([new Uint8Array(4)], "print.png", { type: "image/png" });
  const jpg = new File([new Uint8Array(8)], "foto.jpg", { type: "image/jpeg" });

  function fakeFetch(handlers: { presign?: () => Response; put?: (url: string) => Response }) {
    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/upload/presign") {
        return handlers.presign?.() ?? Response.json({
          uploads: [
            { fileKey: "t/novo/1.png", uploadUrl: "https://r2.test/1", name: "print.png", expiresIn: 600 },
            { fileKey: "t/novo/2.jpg", uploadUrl: "https://r2.test/2", name: "foto.jpg", expiresIn: 600 },
          ],
        });
      }
      return handlers.put?.(url) ?? new Response(null, { status: 200 });
    });
  }

  it("envia metadados ao presign e faz PUT de cada imagem com seu Content-Type", async () => {
    const fetchImpl = fakeFetch({});
    const result = await uploadFiles([png, jpg], { fetchImpl: fetchImpl as unknown as typeof fetch });

    const [presignUrl, presignInit] = fetchImpl.mock.calls[0];
    expect(presignUrl).toBe("/api/upload/presign");
    expect(JSON.parse(presignInit!.body as string)).toEqual({
      files: [
        { name: "print.png", type: "image/png", size: 4 },
        { name: "foto.jpg", type: "image/jpeg", size: 8 },
      ],
    });

    const puts = fetchImpl.mock.calls.slice(1);
    expect(puts.map(([u]) => u).sort()).toEqual(["https://r2.test/1", "https://r2.test/2"]);
    for (const [url, init] of puts) {
      expect(init!.method).toBe("PUT");
      const expected = url === "https://r2.test/1" ? "image/png" : "image/jpeg";
      expect((init!.headers as Record<string, string>)["Content-Type"]).toBe(expected);
    }

    expect(result).toEqual([
      { fileKey: "t/novo/1.png", name: "print.png", size: 4, type: "image/png" },
      { fileKey: "t/novo/2.jpg", name: "foto.jpg", size: 8, type: "image/jpeg" },
    ]);
  });

  it("repassa ticketId e threadToken ao presign", async () => {
    const fetchImpl = fakeFetch({
      presign: () => Response.json({ uploads: [{ fileKey: "k", uploadUrl: "https://r2.test/1", name: "print.png", expiresIn: 600 }] }),
    });
    await uploadFiles([png], { ticketId: "T1", threadToken: "tok", fetchImpl: fetchImpl as unknown as typeof fetch });
    const body = JSON.parse(fetchImpl.mock.calls[0][1]!.body as string);
    expect(body.ticketId).toBe("T1");
    expect(body.threadToken).toBe("tok");
  });

  it("lança a mensagem do servidor quando o presign falha e não faz PUT", async () => {
    const fetchImpl = fakeFetch({ presign: () => Response.json({ error: "Não autenticado" }, { status: 401 }) });
    await expect(uploadFiles([png], { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow("Não autenticado");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("usa a primeira mensagem de fieldErrors quando o servidor valida o payload", async () => {
    const fetchImpl = fakeFetch({
      presign: () =>
        Response.json({ error: "Dados inválidos", fieldErrors: { files: ["Máximo de 5 arquivos por envio"] } }, { status: 400 }),
    });
    await expect(uploadFiles([png], { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(
      "Máximo de 5 arquivos por envio"
    );
  });

  it("lança erro identificando o arquivo quando o PUT no R2 falha", async () => {
    const fetchImpl = fakeFetch({ put: (url) => new Response(null, { status: url.endsWith("/2") ? 403 : 200 }) });
    await expect(uploadFiles([png, jpg], { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(
      'Falha ao enviar "foto.jpg"'
    );
  });

  it("lança erro genérico quando a rede cai", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(uploadFiles([png], { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(
      "Não foi possível enviar os arquivos. Verifique sua conexão."
    );
  });

  it("chama onProgress com status uploading e done para cada arquivo", async () => {
    const updates: UploadProgress[] = [];
    const fetchImpl = fakeFetch({});
    await uploadFiles([png, jpg], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onProgress: (u) => updates.push({ ...u }),
    });
    expect(updates).toEqual([
      { index: 0, progress: 0, status: "uploading" },
      { index: 1, progress: 0, status: "uploading" },
      { index: 0, progress: 1, status: "done" },
      { index: 1, progress: 1, status: "done" },
    ]);
  });

  it("chama onProgress com status error quando o PUT falha", async () => {
    const updates: UploadProgress[] = [];
    const fetchImpl = fakeFetch({ put: () => new Response(null, { status: 403 }) });
    await expect(
      uploadFiles([png], {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        onProgress: (u) => updates.push({ ...u }),
      })
    ).rejects.toThrow();
    expect(updates.some((u) => u.status === "error")).toBe(true);
  });

  it("aborta o upload quando o signal é cancelado antes do PUT", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      uploadFiles([png], {
        fetchImpl: vi.fn() as unknown as typeof fetch,
        signal: controller.signal,
      })
    ).rejects.toThrow("Upload cancelado");
  });

  it("lança 'Upload cancelado' quando o signal aborta durante fetch", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.signal) {
        // Simula a resposta do presign
        if (String(_url) === "/api/upload/presign") {
          return Response.json({
            uploads: [{ fileKey: "t/novo/1.png", uploadUrl: "https://r2.test/1", name: "print.png", expiresIn: 600 }],
          });
        }
        // Simula abort durante PUT
        controller.abort();
        throw new DOMException("The operation was aborted", "AbortError");
      }
      return new Response(null, { status: 200 });
    });
    await expect(
      uploadFiles([png], { fetchImpl: fetchImpl as unknown as typeof fetch, signal: controller.signal })
    ).rejects.toThrow("Upload cancelado");
  });
});

describe("buildDownloadUrl", () => {
  it("monta a URL da rota de download preservando as barras da chave", () => {
    expect(buildDownloadUrl("t1/tk1/a.png")).toBe("/api/upload/download/t1/tk1/a.png");
  });

  it("acrescenta o token da thread como query string", () => {
    expect(buildDownloadUrl("t1/tk1/a.png", "tok 1")).toBe("/api/upload/download/t1/tk1/a.png?token=tok%201");
  });
});

describe("formatFileSize", () => {
  it.each([
    [512, "512 B"],
    [1536, "1,5 KB"],
    [2 * 1024 * 1024, "2,0 MB"],
    [10 * 1024 * 1024, "10,0 MB"],
  ])("formata %i bytes como %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe("isImageMime", () => {
  it("reconhece png e jpeg como imagem e pdf/docx como documento", () => {
    expect(isImageMime("image/png")).toBe(true);
    expect(isImageMime("image/jpeg")).toBe(true);
    expect(isImageMime("application/pdf")).toBe(false);
    expect(isImageMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(false);
  });
});
