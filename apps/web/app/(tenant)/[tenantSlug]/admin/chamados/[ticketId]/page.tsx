import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { getSession } from "@empresa/auth";

import { getTicketById, checkAutoClose } from "@/lib/tickets/data";
import { getMessagesByTicket } from "@/lib/messages/data";
import { getAttachmentsByTicket } from "@/lib/attachments/data";
import { getThreadAccessByTicket } from "@/lib/messages/data";
import { getTenantBySlug } from "@/lib/tenants/data";
import { getUserById } from "@/lib/users/data";
import { TICKET_STATUS } from "@/lib/tickets/constants";
import { Badge } from "@empresa/ui";

import { AttachmentList } from "@/components/shared/attachment-list";
import { ThreadHeader } from "@/components/thread/thread-header";
import { AdminThreadView } from "./admin-thread-view";

interface TicketDetailPageProps {
  params: Promise<{ tenantSlug: string; ticketId: string }>;
}

export async function generateMetadata({
  params,
}: TicketDetailPageProps): Promise<Metadata> {
  const { ticketId } = await params;
  const ticket = await getTicketById(ticketId);
  return {
    title: ticket ? `Chamado: ${ticket.title}` : "Chamado não encontrado",
  };
}

export default async function AdminTicketDetailPage({
  params,
}: TicketDetailPageProps) {
  const { tenantSlug, ticketId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${tenantSlug}/auth`);
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.id !== session.tenantId) {
    notFound();
  }

  // Check-on-access: auto-close se deadline expirou
  await checkAutoClose(ticketId);

  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.tenantId !== session.tenantId) {
    notFound();
  }

  const messages = await getMessagesByTicket(ticketId);
  const ticketAttachments = await getAttachmentsByTicket(ticketId, session.tenantId);
  const threadAccess = await getThreadAccessByTicket(ticketId);
  const adminUser = await getUserById(session.sub);
  const adminName = adminUser?.name ?? "Admin";

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
        <Link
          href={`/${tenantSlug}/admin/chamados`}
          className="hover:text-[var(--color-foreground)] hover:underline"
        >
          Chamados
        </Link>
        <span>/</span>
        <span className="text-[var(--color-foreground)]">{ticket.title}</span>
      </nav>

      {/* Informações do chamado */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-foreground)]">
              {ticket.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Solicitante: {ticket.requester} · Categoria: {ticket.category}
            </p>
            {ticket.relatedTicketId && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Vinculado ao chamado:{" "}
                <Link
                  href={`/${tenantSlug}/admin/chamados/${ticket.relatedTicketId}`}
                  className="underline hover:text-[var(--color-foreground)]"
                >
                  {ticket.relatedTicketId}
                </Link>
              </p>
            )}
          </div>
          <Badge variant={ticket.status as "open" | "in_progress" | "resolved" | "pending_feedback" | "closed"}>
            {TICKET_STATUS[ticket.status]}
          </Badge>
        </div>

        {ticket.description && (
          <p className="mt-3 text-sm text-[var(--color-foreground)]">
            {ticket.description}
          </p>
        )}

        {ticketAttachments.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
              Anexos do chamado
            </h2>
            <AttachmentList attachments={ticketAttachments} />
          </div>
        )}
      </div>

      {/* Thread Header + Chat */}
      <ThreadHeader tenant={tenant} ticket={ticket} />

      <AdminThreadView
        ticket={ticket}
        messages={messages}
        tenant={tenant}
        tenantSlug={tenantSlug}
        adminName={adminName}
        existingToken={threadAccess?.token}
      />
    </div>
  );
}
