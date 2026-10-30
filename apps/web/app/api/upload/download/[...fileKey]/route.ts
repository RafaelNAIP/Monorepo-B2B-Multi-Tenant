import { resolveUploadActor } from "@/lib/attachments/access";
import { getAttachmentByKey } from "@/lib/attachments/data";
import { isR2Configured } from "@/lib/storage/client";
import { getTenantIdFromKey } from "@/lib/storage/keys";
import { getPresignedDownloadUrl } from "@/lib/storage/presign";

function notFound() {
  return Response.json({ error: "Anexo não encontrado" }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

/** Redireciona (302) para uma URL assinada de download do anexo */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileKey: string[] }> }
) {
  if (!isR2Configured()) {
    return Response.json(
      { error: "Download indisponível: armazenamento não configurado" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const token = new URL(request.url).searchParams.get("token");
  const actor = await resolveUploadActor(token);
  if (!actor) {
    return Response.json({ error: "Não autenticado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const fileKey = (await params).fileKey.join("/");

  // Defesa em profundidade: a chave carrega o tenantId no primeiro segmento
  if (getTenantIdFromKey(fileKey) !== actor.tenantId) return notFound();

  const attachment = await getAttachmentByKey(fileKey, actor.tenantId);
  if (!attachment) return notFound();

  // Cliente da thread pública só acessa anexos do próprio chamado
  if (actor.ticketId && attachment.ticketId !== actor.ticketId) return notFound();

  const url = await getPresignedDownloadUrl({ fileKey, fileName: attachment.fileName });
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "private, no-store" },
  });
}
