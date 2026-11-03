import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "../../packages/auth/src/lib/constants";
import { verifySessionToken } from "../../packages/auth/src/lib/token";

/**
 * Middleware multi-tenant com verificação HMAC-SHA256:
 * 1. Ignora rotas públicas (API, assets, estáticos)
 * 2. Verifica assinatura HMAC do cookie de sessão
 * 3. Valida que tenantSlug do token corresponde ao path
 * 4. Redireciona para login se qualquer verificação falhar
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const tenantSlug = segments[0];

  // ── Rotas públicas (sem verificação) ──────────────────────────
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ── Apenas protege dashboard, chamados, admin ─────────────────
  const protectedSections = ["dashboard", "chamados", "admin"];
  if (!protectedSections.includes(segments[1])) {
    return NextResponse.next();
  }

  // ── Verifica cookie HMAC ──────────────────────────────────────
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(request, tenantSlug, pathname);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Sem secret, não é possível verificar — redireciona
    return redirectToLogin(request, tenantSlug, pathname);
  }

  const session = await verifySessionToken(token, secret);
  if (!session) {
    return redirectToLogin(request, tenantSlug, pathname);
  }

  // ── Verifica que o tenant do token bate com o do path ─────────
  if (session.tenantSlug !== tenantSlug) {
    return redirectToLogin(request, tenantSlug, pathname);
  }

  return NextResponse.next();
}

function redirectToLogin(
  request: NextRequest,
  tenantSlug: string,
  callbackPath: string
): NextResponse {
  const loginUrl = new URL(`/${tenantSlug}/auth`, request.url);
  loginUrl.searchParams.set("callbackUrl", callbackPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes
     * - _next (static files, images)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
