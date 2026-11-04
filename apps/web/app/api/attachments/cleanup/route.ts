import { timingSafeEqual } from "node:crypto";

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

/**
 * GET /api/attachments/cleanup
 * Disparado pelo Vercel Cron, que faz GET com `Authorization: Bearer <CRON_SECRET>`.
 * Sem CRON_SECRET configurado, a rota fica fechada (nunca aberta por padrão).
 */
export async function GET(request: Request) {
  if (!isValidCronRequest(request.headers.get("authorization"))) {
    return Response.json({ error: "Não autorizado" }, { status: 403 });
  }

  const result = await cleanupOrphanAttachments();
  return Response.json(result);
}

function isValidCronRequest(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorization) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
