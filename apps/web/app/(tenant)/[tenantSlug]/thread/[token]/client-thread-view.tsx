"use client";

import type { Ticket } from "@/lib/tickets/types";
import type { Message } from "@/lib/messages/types";
import type { Tenant } from "@/lib/tenants/types";

import { useThreadSSE } from "@/hooks/use-thread-sse";
import { MessageList } from "@/components/thread/message-list";
import { MessageInput } from "@/components/thread/message-input";
import { FeedbackCard } from "@/components/thread/feedback-card";

interface ClientThreadViewProps {
  ticket: Ticket;
  messages: Message[];
  tenant: Tenant;
  tenantSlug: string;
  clientName: string;
}

/**
 * View client da thread para o cliente — faz polling a cada 3s
 * para ver novas mensagens do admin e mudanças de status.
 */
export function ClientThreadView({
  ticket: initialTicket,
  messages: initialMessages,
  tenant,
  tenantSlug,
  clientName,
}: ClientThreadViewProps) {
  const { messages: liveMessages, ticket: liveTicket } = useThreadSSE(
    initialTicket,
    initialMessages
  );

  const isActive =
    liveTicket.status === "in_progress" || liveTicket.status === "open";
  const isPendingFeedback = liveTicket.status === "pending_feedback";
  const isClosed =
    liveTicket.status === "resolved" || liveTicket.status === "closed";

  return (
    <div className="flex flex-1 flex-col">
      {/* Mensagens */}
      <div className="flex flex-1 flex-col">
        <MessageList
          messages={liveMessages}
          currentRole="client"
          primaryColor={tenant.theme.primaryColor}
        />
      </div>

      {/* Card de feedback quando admin desconectou */}
      {isPendingFeedback && (
        <FeedbackCard
          ticket={liveTicket}
          tenantSlug={tenantSlug}
          primaryColor={tenant.theme.primaryColor}
        />
      )}

      {/* Mensagem de encerramento */}
      {isClosed && (
        <div className="mx-4 mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted,#f1f5f9)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Este chamado foi encerrado.
            {liveTicket.closedReason === "client_confirmed" &&
              " O problema foi marcado como resolvido."}
            {liveTicket.closedReason === "auto_closed" &&
              " O chamado foi fechado automaticamente após 24h sem resposta."}
            {liveTicket.closedReason === "client_unresolved" &&
              " Um novo chamado foi criado para dar continuidade ao atendimento."}
          </p>
        </div>
      )}

      {/* Input de mensagem — só se o chamado está ativo */}
      <MessageInput
        ticketId={liveTicket.id}
        tenantId={liveTicket.tenantId}
        senderRole="client"
        senderName={clientName}
        tenantSlug={tenantSlug}
        primaryColor={tenant.theme.primaryColor}
        disabled={!isActive}
      />
    </div>
  );
}
