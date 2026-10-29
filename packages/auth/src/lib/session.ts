import { cookies } from "next/headers";

// ─── Session payload ────────────────────────────────────────────

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  tenantId: string;
  tenantSlug: string;
  role: "admin" | "client";
}

const COOKIE_NAME = "empresa-session";

/**
 * Mock: grava a sessão como JSON no cookie.
 * Em produção, usar JWT assinado.
 */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
}

/**
 * Lê a sessão do cookie. Retorna null se não autenticado.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Remove o cookie de sessão (logout).
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
