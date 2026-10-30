// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImageUploadModal } from "@/components/shared/image-upload-modal";
import type { UploadedFile, UploadProgress } from "@/lib/attachments/client";

afterEach(cleanup);

const makeFile = (name: string, type = "image/png", size = 100) =>
  new File([new Uint8Array(size)], name, { type });

function makeUpload(behavior: "success" | "error" | "slow" = "success") {
  return vi.fn(async (files: File[], options?: { onProgress?: (u: UploadProgress) => void }): Promise<UploadedFile[]> => {
    if (behavior === "error") throw new Error("Falha simulada");
    if (behavior === "slow") {
      // Simula upload lento — chama onProgress mas nunca resolve
      for (let i = 0; i < files.length; i++) {
        options?.onProgress?.({ index: i, progress: 0, status: "uploading" });
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return [];
    }
    // Sucesso imediato
    for (let i = 0; i < files.length; i++) {
      options?.onProgress?.({ index: i, progress: 0, status: "uploading" });
      options?.onProgress?.({ index: i, progress: 1, status: "done" });
    }
    return files.map((f, i) => ({
      fileKey: `t/novo/${f.name}-${i}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));
  });
}

function setup(
  upload = makeUpload(),
  overrides: Partial<Parameters<typeof ImageUploadModal>[0]> = {}
) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const utils = render(
    createElement(ImageUploadModal, {
      open: true,
      onClose,
      onConfirm,
      upload,
      ...overrides,
    })
  );
  return { upload, onClose, onConfirm, ...utils };
}

describe("ImageUploadModal", () => {
  it("não renderiza quando open é false", () => {
    render(createElement(ImageUploadModal, { open: false, onClose: vi.fn(), onConfirm: vi.fn() }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renderiza o modal com zona de drop e botão de seleção", () => {
    setup();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTestId("drop-zone")).toBeTruthy();
    expect(screen.getByText("Selecionar imagens")).toBeTruthy();
  });

  it("aceita arquivos via input hidden e exibe thumbnail", async () => {
    // Precisamos mockar createObjectURL
    const revokeUrl = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:preview", revokeObjectURL: revokeUrl });

    const { upload } = setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("a.png")] } });

    await waitFor(() => expect(upload).toHaveBeenCalledOnce());
    expect(screen.getByAltText("a.png")).toBeTruthy();

    vi.unstubAllGlobals();
  });

  it("exibe 'Enviada' após upload bem-sucedido", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:ok", revokeObjectURL: vi.fn() });

    const { upload } = setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("b.png")] } });

    await waitFor(() => expect(upload).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Enviada")).toBeTruthy());

    vi.unstubAllGlobals();
  });

  it("chama onConfirm com os arquivos enviados ao clicar Confirmar", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:ok", revokeObjectURL: vi.fn() });

    const { onConfirm } = setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("c.png")] } });

    await waitFor(() => expect(screen.getByText("Enviada")).toBeTruthy());

    fireEvent.click(screen.getByText(/Confirmar/));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm.mock.calls[0][0]).toHaveLength(1);
    expect(onConfirm.mock.calls[0][0][0].fileKey).toBe("t/novo/c.png-0");

    vi.unstubAllGlobals();
  });

  it("permite remover um arquivo da lista", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });

    setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("d.png")] } });

    await waitFor(() => expect(screen.getByText("d.png")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Remover d.png" }));
    expect(screen.queryByText("d.png")).toBeNull();

    vi.unstubAllGlobals();
  });

  it("exibe erro de validação para tipo não suportado", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });

    const { upload } = setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("virus.exe", "application/x-msdownload")] } });

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toContain("tipo de arquivo não suportado");
    expect(upload).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("exibe erro quando upload falha", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });

    setup(makeUpload("error"));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("e.png")] } });

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toContain("Falha simulada");

    vi.unstubAllGlobals();
  });

  it("chama onClose ao fechar o modal", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("botão Confirmar fica desabilitado sem uploads concluídos", () => {
    setup();
    const confirmBtn = screen.getByText(/Confirmar/) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("aceita arquivos via drag and drop", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:drop", revokeObjectURL: vi.fn() });

    const { upload } = setup();
    const dropZone = screen.getByTestId("drop-zone");

    const file = makeFile("dropped.png");
    const dataTransfer = { files: [file] };

    fireEvent.dragOver(dropZone, { dataTransfer });
    fireEvent.drop(dropZone, { dataTransfer });

    await waitFor(() => expect(upload).toHaveBeenCalledOnce());
    expect(screen.getByAltText("dropped.png")).toBeTruthy();

    vi.unstubAllGlobals();
  });
});
