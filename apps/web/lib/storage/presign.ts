import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getBucketName, getR2Client } from "./client";
import { PRESIGN_DOWNLOAD_EXPIRY, PRESIGN_UPLOAD_EXPIRY } from "./constants";

/** URL para o browser fazer PUT direto no R2. Content-Type e Content-Length ficam assinados. */
export async function getPresignedUploadUrl(input: {
  fileKey: string;
  contentType: string;
  contentLength: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: input.fileKey,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
  });
  return getSignedUrl(getR2Client(), command, {
    expiresIn: PRESIGN_UPLOAD_EXPIRY,
    // Content-Length precisa entrar na assinatura para limitar o tamanho no R2
    unhoistableHeaders: new Set(["content-length"]),
    signableHeaders: new Set(["content-type", "content-length"]),
  });
}

/** Remove aspas, barras invertidas e caracteres de controle do nome usado no header */
function sanitizeFileName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f"\\]/g, "_");
}

/** URL temporária de leitura, forçando download com o nome original */
export async function getPresignedDownloadUrl(input: {
  fileKey: string;
  fileName: string;
}): Promise<string> {
  const safe = sanitizeFileName(input.fileName);
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: input.fileKey,
    ResponseContentDisposition: `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: PRESIGN_DOWNLOAD_EXPIRY });
}
