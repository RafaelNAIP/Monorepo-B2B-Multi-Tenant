"use client";

import { useState, useEffect, useCallback } from "react";

import type { Ticket } from "@/lib/tickets/types";
import type { Message } from "@/lib/messages/types";
import { pollThreadMessages } from "@/lib/messages/actions";

const POLL_INTERVAL_MS = 3000;

/**
 * Mantém mensagens e ticket de uma thread atualizados via polling (3s).
 * Parte dos valores iniciais vindos do servidor e ignora erros de rede
 * silenciosamente — a próxima rodada tenta de novo.
 */
export function useThreadPolling(
  initialTicket: Ticket,
  initialMessages: Message[]
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [ticket, setTicket] = useState<Ticket>(initialTicket);

  const ticketId = initialTicket.id;

  const poll = useCallback(async () => {
    try {
      const result = await pollThreadMessages(ticketId);
      setMessages(result.messages);
      if (result.ticket) {
        setTicket(result.ticket);
      }
    } catch {
      // silently ignore polling errors
    }
  }, [ticketId]);

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  return { messages, ticket };
}
