"use client";

import { useState, useEffect } from "react";

import type { Ticket } from "@/lib/tickets/types";
import type { Message } from "@/lib/messages/types";
import { pollThreadMessages } from "@/lib/messages/actions";
import { createThreadSync } from "@/lib/sse/thread-sync";

/**
 * Mantém mensagens e ticket de uma thread em tempo real.
 *
 * O servidor avisa via SSE que algo mudou e o estado é buscado pela Server
 * Action `pollThreadMessages`. Se o SSE ficar indisponível, cai para polling
 * de segurança e volta ao SSE sozinho (ver `createThreadSync`).
 */
export function useThreadSSE(initialTicket: Ticket, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [ticket, setTicket] = useState<Ticket>(initialTicket);

  const ticketId = initialTicket.id;

  useEffect(() => {
    const sync = createThreadSync({
      ticketId,
      fetchSnapshot: () => pollThreadMessages(ticketId),
      onSnapshot: (result) => {
        setMessages(result.messages);
        if (result.ticket) setTicket(result.ticket);
      },
    });
    sync.start();
    return () => sync.stop();
  }, [ticketId]);

  return { messages, ticket };
}
