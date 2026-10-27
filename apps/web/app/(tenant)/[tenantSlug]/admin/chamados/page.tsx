import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@empresa/auth";

import { getTickets } from "@/lib/tickets/data";
import { getUserById } from "@/lib/users/data";

import { AdminTicketTable } from "./admin-ticket-table";

export const metadata: Metadata = {
  title: "Chamados",
};

interface ChamadosPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminChamadosPage({
  params,
}: ChamadosPageProps) {
  const { tenantSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${tenantSlug}/auth`);
  }

  const tickets = await getTickets(session.tenantId);

  // Resolve nomes dos admins atribuídos
  const assignedNames: Record<string, string> = {};
  for (const ticket of tickets) {
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
        tickets={tickets}
        assignedNames={assignedNames}
        adminUserId={session.sub}
        tenantSlug={tenantSlug}
      />
    </div>
  );
}
