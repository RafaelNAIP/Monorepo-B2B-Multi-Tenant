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
 *  1. threadToken explícito → ThreadAccess válido para aquele ticketId
 *     (quando o form ou a URL fornecem o token, o ator é sempre "client")
 *  2. Cookie de sessão → admin que pertence ao tenant do ticket
 *
 * A identidade SEMPRE vem de credenciais, NUNCA de FormData.
 */
export async function resolveThreadActor(
  ticketId: string,
  threadToken?: string | null
): Promise<ResolveResult> {
  // ── Tentativa 1: token público de thread (explícito, tem prioridade) ──
  if (threadToken?.trim()) {
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

  // ── Tentativa 2: sessão de admin (cookie) ──
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

  return { ok: false, status: 401, message: "Autenticação necessária." };
}
