"use client";

import { useActionState, startTransition, useMemo } from "react";

import type { Ticket } from "@/lib/tickets/types";
import type { Message } from "@/lib/messages/types";
import type { Tenant } from "@/lib/tenants/types";
import {
  disconnectTicketAction,
  type AssignTicketActionState,
} from "@/lib/tickets/actions";

import { useThreadPolling } from "@/hooks/use-thread-polling";
import { AdminThreadActions } from "@/components/thread/admin-thread-actions";
import { MessageList } from "@/components/thread/message-list";
import { MessageInput } from "@/components/thread/message-input";

interface AdminThreadViewProps {
  ticket: Ticket;
  messages: Message[];
  tenant: Tenant;
  tenantSlug: string;
  adminName: string;
  existingToken?: string;
}

const initialState: AssignTicketActionState = {
  success: false,
  error: null,
};

/**
 * View client da thread para o admin — encapsula a lógica de desconectar
 * a conversa (useActionState) e renderiza os componentes da thread.
 * Faz polling a cada 3s para ver novas mensagens do cliente.
 */
export function AdminThreadView({
  ticket: initialTicket,
  messages: initialMessages,
  tenant,
  tenantSlug,
  adminName,
  existingToken,
}: AdminThreadViewProps) {
  const { messages: liveMessages, ticket: liveTicket } = useThreadPolling(
    initialTicket,
    initialMessages
  );

  const [disconnectState, disconnectAction, isDisconnecting] = useActionState(
    disconnectTicketAction,
    initialState
  );

  const canSendMessages =
    liveTicket.status === "in_progress" || liveTicket.status === "open";

  /** O cliente se conectou quando há pelo menos uma mensagem dele na thread. */
  const clientConnected = useMemo(
    () => liveMessages.some((m) => m.senderRole === "client"),
    [liveMessages]
  );

  /**
   * Permite encerrar quando:
   * 1. O cliente já se conectou (enviou mensagem), OU
   * 2. O ticket está em andamento há ≥ 3 minutos sem resposta do cliente
   *    (inatividade — o admin pode descartar o chamado).
   */
  const inactivityMinutes = 3;
  const ticketAgeMs =
    Date.now() - new Date(liveTicket.createdAt).getTime();
  const inactivityReached = ticketAgeMs >= inactivityMinutes * 60 * 1000;

  const canDisconnect = clientConnected || inactivityReached;

  function handleDisconnect() {
    const formData = new FormData();
    formData.set("ticketId", liveTicket.id);
    formData.set("tenantSlug", tenantSlug);
    startTransition(() => {
      disconnectAction(formData);
    });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-lg border border-[var(--color-border)]">
      {/* Ações do admin */}
      <AdminThreadActions
        ticket={liveTicket}
        tenantSlug={tenantSlug}
        existingToken={existingToken}
        primaryColor={tenant.theme.primaryColor}
        onDisconnect={handleDisconnect}
        isDisconnecting={isDisconnecting}
        canDisconnect={canDisconnect}
      />

      {disconnectState.error && (
        <div className="border-b border-[var(--color-border)] bg-red-50 px-4 py-2 dark:bg-red-900/20">
          <p className="text-xs text-[var(--color-destructive)]">
            {disconnectState.error}
          </p>
        </div>
      )}

      {/* Lista de mensagens */}
      <MessageList
        messages={liveMessages}
        currentRole="admin"
        primaryColor={tenant.theme.primaryColor}
      />

      {/* Input de mensagem */}
      <MessageInput
        ticketId={liveTicket.id}
        tenantId={liveTicket.tenantId}
        senderRole="admin"
        senderName={adminName}
        tenantSlug={tenantSlug}
        primaryColor={tenant.theme.primaryColor}
        disabled={!canSendMessages}
      />
    </div>
  );
}
