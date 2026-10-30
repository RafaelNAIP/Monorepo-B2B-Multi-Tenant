"use client";

import { useId, useRef, useState } from "react";

import {
  ACCEPTED_MIME_TYPES,
  formatFileSize,
  uploadFiles,
  validateSelection,
  type UploadedFile,
} from "@/lib/attachments/client";
import { MAX_FILES_PER_UPLOAD } from "@/lib/storage/constants";

interface FileUploaderProps {
  /** Chamado existente (ex.: anexos de mensagens). Em chamado novo, omitir. */
  ticketId?: string;
  /** Token da thread pública, quando o usuário não tem sessão */
  threadToken?: string;
  label?: string;
  disabled?: boolean;
  /** Avisa o formulário pai para bloquear o envio enquanto há upload em andamento */
  onUploadingChange?: (uploading: boolean) => void;
  /** Permite trocar a função de upload (testes) */
  upload?: typeof uploadFiles;
}

/**
 * Seletor de arquivos que envia direto ao R2 por presigned URL e expõe as keys
 * no campo oculto `attachmentKeys` (JSON), lido pelas Server Actions.
 */
export function FileUploader({
  ticketId,
  threadToken,
  label = "Anexos (opcional)",
  disabled = false,
  onUploadingChange,
  upload = uploadFiles,
}: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const atLimit = files.length >= MAX_FILES_PER_UPLOAD;

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    // Permite escolher o mesmo arquivo novamente depois de removê-lo
    if (inputRef.current) inputRef.current.value = "";
    if (selected.length === 0) return;

    const { accepted, errors: validationErrors } = validateSelection(files.length, selected);
    setErrors(validationErrors);
    if (accepted.length === 0) return;

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const uploaded = await upload(accepted, { ticketId, threadToken });
      setFiles((current) => [...current, ...uploaded]);
    } catch (error) {
      setErrors((current) => [
        ...current,
        error instanceof Error ? error.message : "Não foi possível enviar os arquivos.",
      ]);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function removeFile(fileKey: string) {
    setFiles((current) => current.filter((f) => f.fileKey !== fileKey));
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>

      <input type="hidden" name="attachmentKeys" value={JSON.stringify(files.map((f) => f.fileKey))} />

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES}
        disabled={disabled || uploading || atLimit}
        onChange={handleChange}
        aria-describedby={`${inputId}-help`}
        className="block w-full text-sm text-[var(--color-foreground)] file:mr-3 file:rounded-md file:border file:border-[var(--color-border)] file:bg-[var(--color-background)] file:px-3 file:py-1.5 file:text-sm disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p id={`${inputId}-help`} className="text-xs text-[var(--color-muted-foreground)]">
        Até {MAX_FILES_PER_UPLOAD} imagens de 10 MB: .png, .jpg, .jpeg, .webp
      </p>

      {uploading && (
        <p role="status" className="text-xs text-[var(--color-muted-foreground)]">
          Enviando arquivos...
        </p>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-[var(--color-destructive)]">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file) => (
            <li
              key={file.fileKey}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
            >
              <span className="truncate">
                <span>{file.name}</span>{" "}
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  ({formatFileSize(file.size)})
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(file.fileKey)}
                aria-label={`Remover ${file.name}`}
                className="shrink-0 text-xs text-[var(--color-destructive)] hover:underline"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
