/**
 * Lê o campo "attachmentKeys" do FormData (lista de keys serializada em JSON).
 * Vazio vira undefined; JSON malformado vira a string crua para o Zod rejeitar com mensagem em português.
 */
export function parseAttachmentKeysField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const ATTACHMENTS_INVALID_MESSAGE =
  "Um ou mais anexos são inválidos ou expiraram. Envie os arquivos novamente.";
