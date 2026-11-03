import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "./constants";
import type { SessionPayload } from "./payload";
import { signSessionToken, verifySessionToken } from "./token";

// ─── Secret guard — crash on startup if missing ─────────────────

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET não está definido. Defina a variável de ambiente antes de iniciar o servidor."
    );
  }
  return secret;
}

// ─── Cookie helpers ─────────────────────────────────────────────

/**
 * Grava sessão como cookie assinado com HMAC-SHA256.
 * Preenche `iat` e `exp` automaticamente.
 */
export async function setSessionCookie(
  payload: Omit<SessionPayload, "iat" | "exp">
): Promise<void> {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };

  const token = await signSessionToken(fullPayload, secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Lê e valida a sessão do cookie HMAC.
 * Retorna `null` se ausente, adulterado, expirado ou malformado.
 * Cookies JSON antigos (pré-HMAC) também retornam `null`.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const secret = getSecret();
    return await verifySessionToken(raw, secret);
  } catch {
    return null;
  }
}

/**
 * Remove o cookie de sessão (logout).
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Re-export do tipo para backward-compat
export type { SessionPayload } from "./payload";
