import { z } from "zod";

import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  isAllowedMimeType,
} from "../storage/constants";

export const fileMetadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome do arquivo é obrigatório")
    .max(255, "Nome do arquivo deve ter no máximo 255 caracteres"),
  type: z.string().refine(isAllowedMimeType, {
    message: `Tipo de arquivo não suportado. Permitidos: ${Object.values(ALLOWED_MIME_TYPES).join(", ")}`,
  }),
  size: z
    .number()
    .int("Tamanho do arquivo inválido")
    .positive("Arquivo vazio não é permitido")
    .max(MAX_FILE_SIZE, "Arquivo deve ter no máximo 10 MB"),
});

export const presignRequestSchema = z.object({
  files: z
    .array(fileMetadataSchema)
    .min(1, "Selecione ao menos um arquivo")
    .max(MAX_FILES_PER_UPLOAD, `Máximo de ${MAX_FILES_PER_UPLOAD} arquivos por envio`),
  ticketId: z.string().min(1).optional(),
  threadToken: z.string().min(1).optional(),
});

export type PresignRequest = z.infer<typeof presignRequestSchema>;

/** Keys de anexos já enviados ao R2, usadas ao criar chamado/mensagem */
export const attachmentKeysSchema = z
  .array(z.string().min(1, "Anexo inválido"))
  .max(MAX_FILES_PER_UPLOAD, `Máximo de ${MAX_FILES_PER_UPLOAD} arquivos por envio`)
  .refine((keys) => new Set(keys).size === keys.length, {
    message: "Anexos duplicados não são permitidos",
  });
