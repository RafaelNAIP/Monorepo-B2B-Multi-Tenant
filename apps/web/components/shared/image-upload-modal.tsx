"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@empresa/ui";

import {
  ACCEPTED_MIME_TYPES,
  formatFileSize,
  uploadFiles,
  validateSelection,
  type UploadedFile,
  type UploadProgress,
} from "@/lib/attachments/client";
import { MAX_FILES_PER_UPLOAD } from "@/lib/storage/constants";

// ─── Tipos internos ────────────────────────────────────────────

interface FileEntry {
  /** ID local para rastreamento (não é a fileKey) */
  localId: string;
  file: File;
  previewUrl: string;
  /** 0 a 1 */
  progress: number;
  status: "pending" | "uploading" | "done" | "error" | "cancelled";
  /** Preenchida após upload concluído */
  result?: UploadedFile;
}

export interface ImageUploadModalProps {
  open: boolean;
  onClose: () => void;
  /** Chaves dos arquivos já confirmados — usado pelo form pai */
  onConfirm: (files: UploadedFile[]) => void;
  ticketId?: string;
  threadToken?: string;
  /** Para testes */
  upload?: typeof uploadFiles;
}

let localIdCounter = 0;
function nextLocalId() {
  return `local-${++localIdCounter}`;
}

// ─── Componente ────────────────────────────────────────────────

export function ImageUploadModal({
  open,
  onClose,
  onConfirm,
  ticketId,
  threadToken,
  upload = uploadFiles,
}: ImageUploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const confirmedFiles = entries.filter((e) => e.status === "done" && e.result);

  // ─── Processamento de arquivos selecionados ──────────────────

  const processFiles = useCallback(
    async (incoming: File[]) => {
      const currentCount = entries.length;
      const { accepted, errors: validationErrors } = validateSelection(currentCount, incoming);
      setErrors(validationErrors);
      if (accepted.length === 0) return;

      // Criar entries com preview local
      const newEntries: FileEntry[] = accepted.map((file) => ({
        localId: nextLocalId(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: "pending" as const,
      }));

      setEntries((prev) => [...prev, ...newEntries]);
      setUploading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const results = await upload(accepted, {
          ticketId,
          threadToken,
          signal: controller.signal,
          onProgress: (update: UploadProgress) => {
            setEntries((prev) =>
              prev.map((e, i) => {
                // Os novos entries começam no offset = currentCount
                const entryIndex = i - currentCount;
                if (entryIndex === update.index) {
                  return {
                    ...e,
                    progress: update.progress,
                    status: update.status === "done" ? "done" : update.status === "error" ? "error" : e.status === "pending" ? "uploading" : e.status,
                  };
                }
                return e;
              })
            );
          },
        });

        // Atribuir resultados
        setEntries((prev) =>
          prev.map((e, i) => {
            const entryIndex = i - currentCount;
            if (entryIndex >= 0 && entryIndex < results.length) {
              return { ...e, status: "done", progress: 1, result: results[entryIndex] };
            }
            return e;
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao enviar imagens";
        if (message !== "Upload cancelado") {
          setErrors((prev) => [...prev, message]);
        }
        // Marca entries que não terminaram como erro
        setEntries((prev) =>
          prev.map((e) => (e.status === "pending" || e.status === "uploading" ? { ...e, status: "error" } : e))
        );
      } finally {
        setUploading(false);
        abortRef.current = null;
      }
    },
    [entries.length, ticketId, threadToken, upload]
  );

  // ─── Handlers ────────────────────────────────────────────────

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (selected.length > 0) processFiles(selected);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function removeEntry(localId: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.localId === localId);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((e) => e.localId !== localId);
    });
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  function handleConfirm() {
    const files = confirmedFiles.map((e) => e.result!);
    // Limpar preview URLs
    for (const entry of entries) URL.revokeObjectURL(entry.previewUrl);
    setEntries([]);
    setErrors([]);
    onConfirm(files);
  }

  function handleClose() {
    if (uploading) cancelUpload();
    for (const entry of entries) URL.revokeObjectURL(entry.previewUrl);
    setEntries([]);
    setErrors([]);
    onClose();
  }

  // ─── Render ──────────────────────────────────────────────────

  if (!open) return null;

  const atLimit = entries.length >= MAX_FILES_PER_UPLOAD;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Anexar imagens"
    >
      <div className="mx-4 w-full max-w-lg rounded-xl bg-[var(--color-background)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Anexar imagens</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            ✕
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          data-testid="drop-zone"
          className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
              : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
          } ${atLimit || uploading ? "pointer-events-none opacity-50" : ""}`}
          onClick={() => !atLimit && !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Área de arrastar e soltar imagens"
        >
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Arraste imagens aqui ou clique para selecionar
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Até {MAX_FILES_PER_UPLOAD} imagens de 10 MB: .png, .jpg, .jpeg, .webp
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />

        {/* Botão de selecionar */}
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            disabled={atLimit || uploading}
            onClick={() => inputRef.current?.click()}
          >
            Selecionar imagens
          </Button>
        </div>

        {/* Erros */}
        {errors.length > 0 && (
          <ul role="alert" className="mt-3 space-y-1 text-sm text-[var(--color-destructive)]">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        {/* Lista de imagens */}
        {entries.length > 0 && (
          <ul className="mt-4 max-h-60 space-y-3 overflow-y-auto" data-testid="image-list">
            {entries.map((entry) => (
              <li
                key={entry.localId}
                className="flex items-center gap-3 rounded-md border border-[var(--color-border)] p-2"
              >
                {/* Thumbnail */}
                <img
                  src={entry.previewUrl}
                  alt={entry.file.name}
                  className="h-12 w-12 rounded object-cover"
                />

                {/* Info + Progress */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--color-foreground)]">{entry.file.name}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {formatFileSize(entry.file.size)}
                  </p>

                  {/* Barra de progresso */}
                  {(entry.status === "uploading" || entry.status === "pending") && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                        style={{ width: `${Math.max(entry.progress * 100, 5)}%` }}
                        role="progressbar"
                        aria-valuenow={Math.round(entry.progress * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Enviando ${entry.file.name}`}
                      />
                    </div>
                  )}

                  {entry.status === "done" && (
                    <p className="text-xs text-green-600">Enviada</p>
                  )}
                  {entry.status === "error" && (
                    <p className="text-xs text-[var(--color-destructive)]">Erro no envio</p>
                  )}
                  {entry.status === "cancelled" && (
                    <p className="text-xs text-[var(--color-muted-foreground)]">Cancelado</p>
                  )}
                </div>

                {/* Botão remover */}
                <button
                  type="button"
                  onClick={() => removeEntry(entry.localId)}
                  aria-label={`Remover ${entry.file.name}`}
                  className="shrink-0 text-xs text-[var(--color-destructive)] hover:underline"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Cancelar upload em andamento */}
        {uploading && (
          <div className="mt-3 flex items-center gap-2">
            <p role="status" className="text-xs text-[var(--color-muted-foreground)]">
              Enviando imagens...
            </p>
            <button
              type="button"
              onClick={cancelUpload}
              className="text-xs text-[var(--color-destructive)] hover:underline"
            >
              Cancelar envio
            </button>
          </div>
        )}

        {/* Ações do modal */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={uploading || confirmedFiles.length === 0}
            onClick={handleConfirm}
          >
            Confirmar ({confirmedFiles.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
