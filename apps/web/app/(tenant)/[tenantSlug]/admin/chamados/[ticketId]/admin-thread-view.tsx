"use client";

import { useActionState, useState, useEffect, useCallback } from "react";

import type { Ticket } from "@/lib/tickets/types";
import type { Message } from "@/lib/messages/types";
import type { Tenant } from "@/lib/tenants/types";
import {
  disconnectTicketAction,
  type AssignTicketActionState,
} from "@/lib/tickets/actions";
import { pollThreadMessages } from "@/lib/messages/actions";

import { AdminThreadActions } from "@/components/thread/admin-thread-actions";
import { MessageList } from "@/components/thread/message-list";
import { MessageInput } from "@/components/thread/message-input";

const POLL_INTERVAL_MS = 3000;

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
  const [liveMessages, setLiveMessages] = useState<Message[]>(initialMessages);
  const [liveTicket, setLiveTicket] = useState<Ticket>(initialTicket);

  const [disconnectState, disconnectAction, isDisconnecting] = useActionState(
    disconnectTicketAction,
    initialState
  );

  // Polling para atualizar mensagens e status do ticket
  const poll = useCallback(async () => {
    try {
      const result = await pollThreadMessages(initialTicket.id);
      setLiveMessages(result.messages);
      if (result.ticket) {
        setLiveTicket(result.ticket);
      }
    } catch {
      // silently ignore polling errors
    }
  }, [initialTicket.id]);

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  const canSendMessages =
    liveTicket.status === "in_progress" || liveTicket.status === "open";

  function handleDisconnect() {
    const formData = new FormData();
    formData.set("ticketId", liveTicket.id);
    formData.set("tenantSlug", tenantSlug);
    disconnectAction(formData);
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
