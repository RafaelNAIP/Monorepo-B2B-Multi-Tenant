import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getThreadAccessByToken } from "@/lib/messages/data";
import { getMessagesByTicket } from "@/lib/messages/data";
import { getTicketById, checkAutoClose } from "@/lib/tickets/data";
import { getTenantBySlug } from "@/lib/tenants/data";

import { ThreadHeader } from "@/components/thread/thread-header";
import { MessageList } from "@/components/thread/message-list";
import { MessageInput } from "@/components/thread/message-input";
import { FeedbackCard } from "@/components/thread/feedback-card";

interface ThreadPageProps {
  params: Promise<{ tenantSlug: string; token: string }>;
}

export async function generateMetadata({
  params,
}: ThreadPageProps): Promise<Metadata> {
  const { tenantSlug, token } = await params;
  const tenant = getTenantBySlug(tenantSlug);
  const access = getThreadAccessByToken(token);

  if (!tenant || !access) {
    return { title: "Thread não encontrada" };
  }

  const ticket = getTicketById(access.ticketId);
  return {
    title: ticket ? `${ticket.title} — ${tenant.name}` : "Thread",
  };
}

export default async function ClientThreadPage({ params }: ThreadPageProps) {
  const { tenantSlug, token } = await params;

  const tenant = getTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const access = getThreadAccessByToken(token);
  if (!access || access.tenantId !== tenant.id) {
    notFound();
  }

  // Check-on-access: auto-close se deadline expirou
  checkAutoClose(access.ticketId);

  const ticket = getTicketById(access.ticketId);
  if (!ticket) {
    notFound();
  }

  const messages = getMessagesByTicket(access.ticketId);

  const isActive = ticket.status === "in_progress" || ticket.status === "open";
  const isPendingFeedback = ticket.status === "pending_feedback";
  const isClosed =
    ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <ThreadHeader tenant={tenant} ticket={ticket} />

      <div className="flex flex-1 flex-col">
        {/* Mensagens */}
        <div className="flex flex-1 flex-col">
          <MessageList
            messages={messages}
            currentRole="client"
            primaryColor={tenant.theme.primaryColor}
          />
        </div>

        {/* Card de feedback quando admin desconectou */}
        {isPendingFeedback && (
          <FeedbackCard
            ticket={ticket}
            tenantSlug={tenantSlug}
            primaryColor={tenant.theme.primaryColor}
          />
        )}

        {/* Mensagem de encerramento */}
        {isClosed && (
          <div className="mx-4 mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted,#f1f5f9)] p-6 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Este chamado foi encerrado.
              {ticket.closedReason === "client_confirmed" &&
                " O problema foi marcado como resolvido."}
              {ticket.closedReason === "auto_closed" &&
                " O chamado foi fechado automaticamente após 24h sem resposta."}
              {ticket.closedReason === "client_unresolved" &&
                " Um novo chamado foi criado para dar continuidade ao atendimento."}
            </p>
          </div>
        )}

        {/* Input de mensagem — só se o chamado está ativo */}
        <MessageInput
          ticketId={ticket.id}
          tenantId={ticket.tenantId}
          senderRole="client"
          senderName={access.clientName}
          tenantSlug={tenantSlug}
          primaryColor={tenant.theme.primaryColor}
          disabled={!isActive}
        />
      </div>
    </div>
  );
}
