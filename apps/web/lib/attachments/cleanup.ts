import { prisma } from "@empresa/db";

import { deleteFile } from "../storage/delete";

/** Anexos pending mais velhos que esse threshold são considerados órfãos */
export const ORPHAN_THRESHOLD_MS = 60 * 60 * 1000; // 1 hora

/**
 * Remove anexos com status `pending` criados há mais de 1 hora.
 * Esses registros são criados no presign mas nunca associados a um chamado/mensagem
 * (upload abandonado, timeout, falha do browser etc).
 *
 * Para cada órfão, tenta deletar do R2 primeiro; só remove do banco os que
 * foram removidos com sucesso do storage.
 */
export async function cleanupOrphanAttachments(): Promise<{ deleted: number; errors: number }> {
  const threshold = new Date(Date.now() - ORPHAN_THRESHOLD_MS);

  const orphans = await prisma.attachment.findMany({
    where: {
      status: "pending",
      createdAt: { lt: threshold },
    },
    select: { id: true, fileKey: true },
  });

  if (orphans.length === 0) return { deleted: 0, errors: 0 };

  const succeeded: string[] = [];
  let errors = 0;

  await Promise.all(
    orphans.map(async (orphan) => {
      try {
        await deleteFile(orphan.fileKey);
        succeeded.push(orphan.id);
      } catch {
        errors++;
      }
    })
  );

  if (succeeded.length > 0) {
    await prisma.attachment.deleteMany({
      where: { id: { in: succeeded } },
    });
  }

  return { deleted: succeeded.length, errors };
}
