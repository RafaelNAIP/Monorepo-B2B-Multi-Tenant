import { getSession } from "@empresa/auth";

import { cleanupOrphanAttachments } from "@/lib/attachments/cleanup";

/**
 * POST /api/attachments/cleanup
 * Remove anexos pending (órfãos) com mais de 1 hora.
 * Restrito a admins autenticados.
 */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  }

  const result = await cleanupOrphanAttachments();
  return Response.json(result);
}
