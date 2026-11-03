import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@empresa/auth";

import { PaginationControls } from "@/components/shared/pagination-controls";
import { getTicketsPage } from "@/lib/tickets/data";
import { parseTicketListParams } from "@/lib/tickets/list-params";
import { getUserById } from "@/lib/users/data";

import { AdminTicketTable } from "./admin-ticket-table";

export const metadata: Metadata = {
  title: "Chamados",
};

interface ChamadosPageProps {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminChamadosPage({
  params,
  searchParams,
}: ChamadosPageProps) {
  const { tenantSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${tenantSlug}/auth`);
  }

  const { page, status, search } = parseTicketListParams(await searchParams);
  // Admin também busca por categoria (paridade com o comportamento anterior)
  const result = await getTicketsPage(session.tenantId, {
    page,
    status,
    search,
    searchCategory: true,
  });

  // Resolve nomes dos admins atribuídos (só da página exibida)
  const assignedNames: Record<string, string> = {};
  for (const ticket of result.items) {
    if (ticket.assignedTo && !assignedNames[ticket.assignedTo]) {
      const user = await getUserById(ticket.assignedTo);
      if (user) {
        assignedNames[ticket.assignedTo] = user.name;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chamados</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Gerencie os chamados abertos pelos clientes da sua empresa.
        </p>
      </div>

      <AdminTicketTable
        tickets={result.items}
        assignedNames={assignedNames}
        adminUserId={session.sub}
        tenantSlug={tenantSlug}
        initialStatus={status}
        initialSearch={search ?? ""}
      />

      <PaginationControls
        pathname={`/${tenantSlug}/admin/chamados`}
        query={{ status, search }}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
      />
    </div>
  );
}
