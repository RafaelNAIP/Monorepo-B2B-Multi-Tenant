import { prisma } from "@empresa/db";
import { getSession } from "@empresa/auth";

/** Quem está fazendo a requisição de upload/download */
export interface UploadActor {
  tenantId: string;
  /** Preenchido apenas para clientes da thread pública: restringe ao chamado do token */
  ticketId?: string;
  source: "session" | "thread";
}

/** Resolve o ator pela sessão (cookie) ou, na falta dela, pelo token da thread pública */
export async function resolveUploadActor(threadToken?: string | null): Promise<UploadActor | null> {
  const session = await getSession();
  if (session) return { tenantId: session.tenantId, source: "session" };

  if (!threadToken) return null;
  const access = await prisma.threadAccess.findFirst({ where: { token: threadToken } });
  if (!access) return null;
  return { tenantId: access.tenantId, ticketId: access.ticketId, source: "thread" };
}

/** Confirma que o chamado pertence ao tenant antes de aceitar anexos para ele */
export async function ticketBelongsToTenant(ticketId: string, tenantId: string): Promise<boolean> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, tenantId },
    select: { id: true },
  });
  return ticket !== null;
}
