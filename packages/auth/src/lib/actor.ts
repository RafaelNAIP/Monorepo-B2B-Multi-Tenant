import type { SessionPayload } from "./payload";
import { getSession } from "./session";

// ─── Tipo de estado genérico para Server Actions ────────────────
// Definido aqui para evitar importação cross-package (apps/web → packages/auth).
// O apps/web pode re-exportar ou manter sua própria cópia compatível.

export interface ActionState {
  success: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]>;
}

// ─── Result types (discriminated union) ─────────────────────────

export type SessionResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; errorState: ActionState };

export interface RequireSessionOptions {
  /** Se informado, exige que a sessão tenha essa role */
  role?: "admin" | "client";
}

// ─── Guard centralizado ─────────────────────────────────────────

/**
 * Guarda de sessão centralizado para Server Actions e Route Handlers.
 *
 * Retorna `{ ok: true, session }` se autenticado (e com a role correta,
 * quando especificada), ou `{ ok: false, errorState }` compatível com
 * ActionState para feedback direto via `useActionState`.
 */
export async function requireSession(
  options?: RequireSessionOptions
): Promise<SessionResult> {
  const session = await getSession();

  if (!session) {
    return {
      ok: false,
      errorState: {
        success: false,
        error: "Sessão expirada ou inválida. Faça login novamente.",
        fieldErrors: {},
      },
    };
  }

  if (options?.role && session.role !== options.role) {
    return {
      ok: false,
      errorState: {
        success: false,
        error: "Acesso negado. Permissão insuficiente.",
        fieldErrors: {},
      },
    };
  }

  return { ok: true, session };
}
