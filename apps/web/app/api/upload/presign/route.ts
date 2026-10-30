import { createAttachment } from "@/lib/attachments/data";
import { resolveUploadActor, ticketBelongsToTenant } from "@/lib/attachments/access";
import { presignRequestSchema } from "@/lib/attachments/schemas";
import { PRESIGN_UPLOAD_EXPIRY } from "@/lib/storage/constants";
import { buildFileKey } from "@/lib/storage/keys";
import { getPresignedUploadUrl } from "@/lib/storage/presign";

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Gera presigned URLs de upload e registra os anexos como pending */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Corpo da requisição inválido" }, 400);
  }

  const parsed = presignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors }, 400);
  }

  const actor = await resolveUploadActor(parsed.data.threadToken);
  if (!actor) return json({ error: "Não autenticado" }, 401);

  // Cliente da thread só envia para o próprio chamado; com sessão, o chamado precisa ser do tenant
  const ticketId = actor.source === "thread" ? actor.ticketId : parsed.data.ticketId;
  if (actor.source === "session" && ticketId && !(await ticketBelongsToTenant(ticketId, actor.tenantId))) {
    return json({ error: "Chamado não encontrado" }, 404);
  }

  try {
    const items = parsed.data.files.map((file) => ({
      file,
      fileKey: buildFileKey({ tenantId: actor.tenantId, ticketId, mimeType: file.type }),
    }));

    // Assina antes de gravar: se a assinatura falhar, não sobram registros pending órfãos
    const uploads = await Promise.all(
      items.map(async ({ file, fileKey }) => ({
        fileKey,
        name: file.name,
        uploadUrl: await getPresignedUploadUrl({
          fileKey,
          contentType: file.type,
          contentLength: file.size,
        }),
        expiresIn: PRESIGN_UPLOAD_EXPIRY,
      }))
    );

    await Promise.all(
      items.map(({ file, fileKey }) =>
        createAttachment({
          tenantId: actor.tenantId,
          ticketId,
          fileKey,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        })
      )
    );

    return json({ uploads }, 200);
  } catch (error) {
    console.error("Falha ao gerar URLs de upload", error);
    return json({ error: "Não foi possível preparar o upload" }, 500);
  }
}
