import { prisma } from "@empresa/db";

import { deleteFile } from "../storage/delete";

/** Cliente Prisma ou client de transação (ambos expõem .attachment) */
type AttachmentDb = Pick<typeof prisma, "attachment">;

/** Erro lançado quando algum anexo informado não pôde ser associado (inválido, expirado ou de outro tenant) */
export const ATTACHMENTS_INVALID = "ATTACHMENTS_INVALID";

// ─── Attachments API ─────────────────────────────────────────────

/** Registra um anexo como pending (antes do upload ao R2 ser confirmado) */
export async function createAttachment(input: {
  tenantId: string;
  ticketId?: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}) {
  return prisma.attachment.create({
    data: {
      tenantId: input.tenantId,
      ...(input.ticketId ? { ticketId: input.ticketId } : {}),
      fileKey: input.fileKey,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      status: "pending",
    },
  });
}

/**
 * Associa anexos pending a um chamado e marca como completed.
 * Filtra por tenant e por "sem dono" para que keys forjadas não roubem anexos de outro tenant/registro.
 * Retorna quantos anexos foram realmente associados.
 */
export async function attachToTicket(
  input: { keys: string[]; ticketId: string; tenantId: string },
  db: AttachmentDb = prisma
): Promise<number> {
  if (input.keys.length === 0) return 0;
  const result = await db.attachment.updateMany({
    where: {
      fileKey: { in: input.keys },
      tenantId: input.tenantId,
      status: "pending",
      ticketId: null,
      messageId: null,
    },
    data: { ticketId: input.ticketId, status: "completed" },
  });
  return result.count;
}

/** Associa anexos pending a uma mensagem (e ao chamado da thread) */
export async function attachToMessage(
  input: { keys: string[]; messageId: string; ticketId: string; tenantId: string },
  db: AttachmentDb = prisma
): Promise<number> {
  if (input.keys.length === 0) return 0;
  const result = await db.attachment.updateMany({
    where: {
      fileKey: { in: input.keys },
      tenantId: input.tenantId,
      status: "pending",
      ticketId: null,
      messageId: null,
    },
    data: { messageId: input.messageId, ticketId: input.ticketId, status: "completed" },
  });
  return result.count;
}

/** Anexos concluídos de um chamado */
export async function getAttachmentsByTicket(ticketId: string, tenantId: string) {
  return prisma.attachment.findMany({
    where: { ticketId, tenantId, status: "completed" },
    orderBy: { createdAt: "asc" },
  });
}

/** Busca um anexo concluído pelo fileKey, restrito ao tenant */
export async function getAttachmentByKey(fileKey: string, tenantId: string) {
  return prisma.attachment.findFirst({
    where: { fileKey, tenantId, status: "completed" },
  });
}

/** Remove o arquivo do R2 e depois o registro. Retorna false se não existir no tenant. */
export async function deleteAttachment(id: string, tenantId: string): Promise<boolean> {
  const attachment = await prisma.attachment.findFirst({ where: { id, tenantId } });
  if (!attachment) return false;
  await deleteFile(attachment.fileKey);
  await prisma.attachment.delete({ where: { id } });
  return true;
}
