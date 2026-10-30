export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_UPLOAD = 5;

/** Presigned URL de upload expira em 10 minutos */
export const PRESIGN_UPLOAD_EXPIRY = 600;
/** Presigned URL de download expira em 1 hora */
export const PRESIGN_DOWNLOAD_EXPIRY = 3600;

/** Mime types permitidos e a extensão usada na chave do bucket */
export const ALLOWED_MIME_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

export type AllowedMimeType = keyof typeof ALLOWED_MIME_TYPES;

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return Object.prototype.hasOwnProperty.call(ALLOWED_MIME_TYPES, value);
}
