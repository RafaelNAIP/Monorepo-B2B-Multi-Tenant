import { buildDownloadUrl, formatFileSize, isImageMime } from "@/lib/attachments/client";
import type { MessageAttachment } from "@/lib/messages/types";

interface AttachmentListProps {
  attachments?: MessageAttachment[];
  /** Token da thread pública: necessário para o cliente (sem sessão) baixar anexos */
  threadToken?: string;
}

/** Lista de anexos: miniatura para imagens, link com nome e tamanho para documentos */
export function AttachmentList({ attachments, threadToken }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <ul data-testid="message-attachments" className="mt-2 space-y-2">
      {attachments.map((attachment) => {
        const href = buildDownloadUrl(attachment.fileKey, threadToken);
        return (
          <li key={attachment.id}>
            {isImageMime(attachment.mimeType) ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                <img
                  src={href}
                  alt={attachment.fileName}
                  loading="lazy"
                  className="max-h-48 rounded-md border border-black/10"
                />
              </a>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-black/10 px-2 py-1 text-xs underline"
              >
                <span>{attachment.fileName}</span>
                <span className="opacity-70">{formatFileSize(attachment.fileSize)}</span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
