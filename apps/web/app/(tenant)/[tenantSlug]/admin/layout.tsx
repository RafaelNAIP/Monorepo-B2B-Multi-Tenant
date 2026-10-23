import { redirect } from "next/navigation";
import Link from "next/link";

import { getSession } from "@empresa/auth";
import { Button } from "@empresa/ui";
import { logoutAction } from "@empresa/auth/actions";

import { AdminNav } from "./admin-nav";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

/**
 * Layout do painel admin — protege todas as rotas /admin.
 * Verifica sessão e role admin.
 */
export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const { tenantSlug } = await params;
  const session = await getSession();

  // Guard: redireciona se não autenticado
  if (!session) {
    redirect(`/${tenantSlug}/auth`);
  }

  // Guard: verifica se o tenant da sessão bate com a URL
  if (session.tenantSlug !== tenantSlug) {
    redirect(`/${session.tenantSlug}/admin`);
  }

  // Guard: verifica se é admin
  if (session.role !== "admin") {
    redirect(`/${tenantSlug}/dashboard`);
  }

  return (
    <div className="min-h-screen">
      {/* ── Barra de navegação ── */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-6">
            <Link
              href={`/${tenantSlug}/admin`}
              className="text-lg font-bold text-[var(--color-foreground)]"
            >
              Painel Admin
            </Link>
            <AdminNav tenantSlug={tenantSlug} />
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {session.name} &middot;{" "}
              <span className="capitalize">{session.role}</span>
            </p>
            <form action={logoutAction}>
              <Button variant="secondary" size="sm" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Conteúdo ── */}
      <main className="mx-auto max-w-6xl p-8">{children}</main>
    </div>
  );
}
