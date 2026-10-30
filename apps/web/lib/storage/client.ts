import { S3Client } from "@aws-sdk/client-s3";

const R2_REQUIRED_VARS = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} não configurada`);
  return value;
}

/** Retorna as variáveis do R2 ausentes; lista vazia = tudo OK */
export function getMissingR2Vars(): string[] {
  return R2_REQUIRED_VARS.filter((name) => !process.env[name]);
}

/** Verifica se todas as variáveis do R2 estão configuradas */
export function isR2Configured(): boolean {
  return getMissingR2Vars().length === 0;
}

export function getBucketName(): string {
  return requireEnv("R2_BUCKET_NAME");
}

/** Cria o client S3 apontando para o Cloudflare R2 (lê o env a cada chamada para falhar com clareza) */
export function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: requireEnv("R2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}
