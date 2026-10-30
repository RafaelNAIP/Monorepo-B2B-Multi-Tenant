// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FileUploader } from "@/components/shared/file-uploader";
import type { UploadedFile } from "@/lib/attachments/client";

afterEach(cleanup);

const makeFile = (name: string, type: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type });

function setup(upload = vi.fn(async (files: File[]): Promise<UploadedFile[]> =>
  files.map((f, i) => ({ fileKey: `t/novo/${f.name}-${i}`, name: f.name, size: f.size, type: f.type }))
), props: Record<string, unknown> = {}) {
  const onUploadingChange = vi.fn();
  const utils = render(createElement(FileUploader, { upload, onUploadingChange, ...props }));
  const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
  const hidden = () => utils.container.querySelector('input[name="attachmentKeys"]') as HTMLInputElement;
  const select = (...files: File[]) => fireEvent.change(input, { target: { files } });
  return { upload, onUploadingChange, input, hidden, select, ...utils };
}

describe("FileUploader", () => {
  it("restringe o seletor apenas a imagens e permite múltiplos arquivos", () => {
    const { input } = setup();
    expect(input.multiple).toBe(true);
    expect(input.accept).toContain("image/png");
    expect(input.accept).toContain("image/jpeg");
    expect(input.accept).toContain("image/webp");
    expect(input.accept).not.toContain("application/pdf");
  });

  it("começa com o campo oculto attachmentKeys vazio", () => {
    const { hidden } = setup();
    expect(JSON.parse(hidden().value)).toEqual([]);
  });

  it("envia o arquivo selecionado e grava a key no campo oculto", async () => {
    const { select, hidden, upload } = setup();
    select(makeFile("print.png", "image/png"));
    await waitFor(() => expect(JSON.parse(hidden().value)).toEqual(["t/novo/print.png-0"]));
    expect(upload).toHaveBeenCalledOnce();
    expect(screen.getByText("print.png")).toBeTruthy();
  });

  it("repassa ticketId e threadToken ao upload", async () => {
    const { select, upload } = setup(undefined, { ticketId: "T1", threadToken: "tok" });
    select(makeFile("a.png", "image/png"));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect((upload.mock.calls[0] as unknown[])[1]).toMatchObject({ ticketId: "T1", threadToken: "tok" });
  });

  it("sinaliza upload em andamento e depois concluído", async () => {
    const { select, onUploadingChange, hidden } = setup();
    select(makeFile("a.png", "image/png"));
    await waitFor(() => expect(JSON.parse(hidden().value)).toHaveLength(1));
    expect(onUploadingChange.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it("rejeita tipo não permitido com mensagem e sem chamar o upload", async () => {
    const { select, upload, hidden } = setup();
    select(makeFile("virus.exe", "application/x-msdownload"));
    expect((await screen.findByRole("alert")).textContent).toContain('"virus.exe": tipo de arquivo não suportado');
    expect(upload).not.toHaveBeenCalled();
    expect(JSON.parse(hidden().value)).toEqual([]);
  });

  it("mostra o erro do upload e não adiciona o arquivo à lista", async () => {
    const failing = vi.fn(async () => {
      throw new Error('Falha ao enviar "a.png"');
    });
    const { select, hidden } = setup(failing);
    select(makeFile("a.png", "image/png"));
    expect((await screen.findByRole("alert")).textContent).toContain('Falha ao enviar "a.png"');
    expect(JSON.parse(hidden().value)).toEqual([]);
    expect(screen.queryByText("a.png")).toBeNull();
  });

  it("remove um arquivo da lista e do campo oculto", async () => {
    const { select, hidden } = setup();
    select(makeFile("a.png", "image/png"));
    await waitFor(() => expect(JSON.parse(hidden().value)).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Remover a.png" }));
    expect(JSON.parse(hidden().value)).toEqual([]);
    expect(screen.queryByText("a.png")).toBeNull();
  });

  it("desabilita o seletor ao atingir 5 arquivos e recusa excedentes", async () => {
    const { select, input, hidden } = setup();
    select(...[1, 2, 3, 4, 5].map((i) => makeFile(`f${i}.png`, "image/png")));
    await waitFor(() => expect(JSON.parse(hidden().value)).toHaveLength(5));
    expect(input.disabled).toBe(true);
  });

  it("acumula seleções sucessivas respeitando o limite", async () => {
    const { select, hidden, upload } = setup();
    select(makeFile("a.png", "image/png"), makeFile("b.png", "image/png"));
    await waitFor(() => expect(JSON.parse(hidden().value)).toHaveLength(2));
    select(makeFile("c.png", "image/png"));
    await waitFor(() => expect(JSON.parse(hidden().value)).toHaveLength(3));
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("permanece desabilitado quando disabled", () => {
    const { input } = setup(undefined, { disabled: true });
    expect(input.disabled).toBe(true);
  });
});
