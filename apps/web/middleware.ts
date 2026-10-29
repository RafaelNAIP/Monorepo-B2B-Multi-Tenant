import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware multi-tenant:
 * 1. Resolve o tenant slug do path
 * 2. Protege rotas /[tenant]/dashboard, /[tenant]/chamados e /[tenant]/admin
 *    contra acesso sem sessão
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const tenantSlug = segments[0];

  // Ignora rotas de API e assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Protege rotas de dashboard, chamados e admin
  if (
    segments[1] === "dashboard" ||
    segments[1] === "chamados" ||
    segments[1] === "admin"
  ) {
    const sessionCookie = request.cookies.get("empresa-session");
    if (!sessionCookie?.value) {
      const loginUrl = new URL(`/${tenantSlug}/auth`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
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
