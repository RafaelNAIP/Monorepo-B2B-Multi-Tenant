import { getSession } from "@empresa/auth";
import { getThreadAccessByToken } from "./data";

// ─── Types ──────────────────────────────────────────────────────

export type ThreadActor =
  | { kind: "admin"; userId: string; tenantId: string; name: string; tenantSlug: string }
  | { kind: "client"; token: string; tenantId: string; clientName: string };

export type ResolveResult =
  | { ok: true; actor: ThreadActor }
  | { ok: false; status: 401 | 403; message: string };

// ─── Resolver ───────────────────────────────────────────────────

/**
 * Resolve quem está acessando a thread a partir de credenciais disponíveis.
 *
 * Prioridade:
 *  1. Cookie de sessão → admin que pertence ao tenant do ticket
 *  2. threadToken (query param) → ThreadAccess válido para aquele ticketId
 *
 * A identidade SEMPRE vem de credenciais, NUNCA de FormData.
 */
export async function resolveThreadActor(
  ticketId: string,
  threadToken?: string | null
): Promise<ResolveResult> {
  // ── Tentativa 1: sessão de admin (cookie) ──
  const session = await getSession();
  if (session) {
    return {
      ok: true,
      actor: {
        kind: "admin",
        userId: session.sub,
        tenantId: session.tenantId,
        name: session.name,
        tenantSlug: session.tenantSlug,
      },
    };
  }

  // ── Tentativa 2: token público de thread ──
  if (!threadToken?.trim()) {
    return { ok: false, status: 401, message: "Autenticação necessária." };
  }

  const access = await getThreadAccessByToken(threadToken);
  if (!access) {
    return { ok: false, status: 401, message: "Token de thread inválido." };
  }

  if (access.ticketId !== ticketId) {
    return {
      ok: false,
      status: 403,
      message: "Token não pertence a este ticket.",
    };
  }

  return {
    ok: true,
    actor: {
      kind: "client",
      token: access.token,
      tenantId: access.tenantId,
      clientName: access.clientName,
    },
  };
}
