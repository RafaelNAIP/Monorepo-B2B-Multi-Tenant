import { redirect } from "next/navigation";

import { getSession } from "@empresa/auth";

import { CreateTicketForm } from "./create-ticket-form";

interface NovoTicketPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function NovoTicketPage({ params }: NovoTicketPageProps) {
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

  return (
    <main className="mx-auto max-w-2xl p-8">
      <header className="border-b border-[var(--color-border)] pb-6">
        <h1 className="text-2xl font-bold">Novo Chamado</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Preencha os campos abaixo para abrir um novo chamado de suporte.
        </p>
      </header>

      <section className="mt-8">
        <CreateTicketForm
          tenantSlug={tenantSlug}
          tenantId={session.tenantId}
          requester={session.name}
        />
      </section>
    </main>
  );
}
