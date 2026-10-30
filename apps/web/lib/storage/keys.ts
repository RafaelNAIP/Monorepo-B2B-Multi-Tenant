import { ALLOWED_MIME_TYPES, isAllowedMimeType } from "./constants";

// Segmentos do caminho aceitam apenas ObjectId/identificadores simples (sem "/" nem "..")
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

/** Gera a chave do arquivo: {tenantId}/{ticketId|novo}/{uuid}.{ext} */
export function buildFileKey(input: {
  tenantId: string;
  ticketId?: string;
  mimeType: string;
}): string {
  if (!isAllowedMimeType(input.mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${input.mimeType}`);
  }
  const ticketSegment = input.ticketId ?? "novo";
  if (!SAFE_SEGMENT.test(input.tenantId) || !SAFE_SEGMENT.test(ticketSegment)) {
    throw new Error("Identificador inválido para a chave do arquivo");
  }
  const ext = ALLOWED_MIME_TYPES[input.mimeType];
  return `${input.tenantId}/${ticketSegment}/${crypto.randomUUID()}.${ext}`;
}

/** Extrai o tenantId (primeiro segmento) de uma chave; null se não tiver o formato esperado */
export function getTenantIdFromKey(fileKey: string): string | null {
  const parts = fileKey.split("/");
  if (parts.length < 3 || !SAFE_SEGMENT.test(parts[0])) return null;
  return parts[0];
}
