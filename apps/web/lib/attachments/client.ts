import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  isAllowedMimeType,
} from "@/lib/storage/constants";

// Utilitários do lado do browser: validação prévia, upload via presigned URL e links de download.

export interface UploadedFile {
  fileKey: string;
  name: string;
  size: number;
  type: string;
}

export const ACCEPTED_MIME_TYPES = Object.keys(ALLOWED_MIME_TYPES).join(",");

/** Valida a seleção antes de enviar; `currentCount` é quantos arquivos já estão selecionados */
export function validateSelection(currentCount: number, incoming: File[]) {
  const accepted: File[] = [];
  const errors: string[] = [];

  for (const file of incoming) {
    if (!isAllowedMimeType(file.type)) {
      errors.push(`"${file.name}": tipo de arquivo não suportado`);
    } else if (file.size === 0) {
      errors.push(`"${file.name}": arquivo vazio`);
    } else if (file.size > MAX_FILE_SIZE) {
      errors.push(`"${file.name}": arquivo maior que 10 MB`);
    } else if (currentCount + accepted.length >= MAX_FILES_PER_UPLOAD) {
      errors.push(`"${file.name}": máximo de ${MAX_FILES_PER_UPLOAD} arquivos por envio`);
    } else {
      accepted.push(file);
    }
  }

  return { accepted, errors };
}

interface PresignResponse {
  uploads?: { fileKey: string; uploadUrl: string; name: string }[];
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const NETWORK_ERROR = "Não foi possível enviar os arquivos. Verifique sua conexão.";

/** Pede as URLs assinadas e envia cada arquivo direto ao R2. Retorna as keys na ordem recebida. */
export async function uploadFiles(
  files: File[],
  options: { ticketId?: string; threadToken?: string; fetchImpl?: typeof fetch } = {}
): Promise<UploadedFile[]> {
  const doFetch = options.fetchImpl ?? fetch;

  try {
    const presignRes = await doFetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        ...(options.ticketId ? { ticketId: options.ticketId } : {}),
        ...(options.threadToken ? { threadToken: options.threadToken } : {}),
      }),
    });

    const payload = (await presignRes.json().catch(() => ({}))) as PresignResponse;
    if (!presignRes.ok || !payload.uploads) {
      const firstFieldError = Object.values(payload.fieldErrors ?? {})[0]?.[0];
      throw new UploadError(firstFieldError ?? payload.error ?? "Não foi possível preparar o upload");
    }

    await Promise.all(
      payload.uploads.map(async (upload, index) => {
        const file = files[index];
        const putRes = await doFetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new UploadError(`Falha ao enviar "${file.name}"`);
      })
    );

    return payload.uploads.map((upload, index) => ({
      fileKey: upload.fileKey,
      name: files[index].name,
      size: files[index].size,
      type: files[index].type,
    }));
  } catch (error) {
    if (error instanceof UploadError) throw error;
    throw new UploadError(NETWORK_ERROR);
  }
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/** URL da rota de download; o token é necessário apenas para o cliente da thread pública */
export function buildDownloadUrl(fileKey: string, threadToken?: string): string {
  const base = `/api/upload/download/${fileKey.split("/").map(encodeURIComponent).join("/")}`;
  return threadToken ? `${base}?token=${encodeURIComponent(threadToken)}` : base;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1).replace(".", ",")} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
