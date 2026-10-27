import { redirect } from "next/navigation";
import Link from "next/link";

import { getSession } from "@empresa/auth";
import { Button } from "@empresa/ui";
import { logoutAction } from "@empresa/auth/actions";

import { getTickets } from "@/lib/tickets/data";
import { TicketList } from "./ticket-list";

interface DashboardPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenantSlug } = await params;
  const session = await getSession();

  // Guard: redireciona se não autenticado
  if (!session) {
    redirect(`/${tenantSlug}/auth`);
  }

  // Guard: verifica se o tenant da sessão bate com a URL
  if (session.tenantSlug !== tenantSlug) {
    redirect(`/${session.tenantSlug}/dashboard`);
  }

  const tickets = await getTickets(session.tenantId);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {session.name} &middot; {session.email} &middot;{" "}
            <span className="capitalize">{session.role}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/${tenantSlug}/chamados/novo`}>
            <Button variant="primary" size="sm">
              + Novo Chamado
            </Button>
          </Link>

          <form action={logoutAction}>
            <Button variant="secondary" size="sm" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <section className="mt-8">
        <TicketList tickets={tickets} tenantSlug={tenantSlug} />
      </section>
    </main>
  );
}
