import type { Message } from "@/lib/messages/types";
import type { SenderRole } from "@/lib/messages/constants";

import { ChatBubble } from "./chat-bubble";

interface MessageListProps {
  messages: Message[];
  currentRole: SenderRole;
  primaryColor?: string;
  threadToken?: string;
}

/**
 * Lista de mensagens da thread — renderiza bolhas alinhadas
 * conforme o papel do remetente atual.
 */
export function MessageList({
  messages,
  currentRole,
  primaryColor,
  threadToken,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Nenhuma mensagem ainda. Inicie a conversa!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          message={msg}
          isOwnMessage={msg.senderRole === currentRole}
          primaryColor={primaryColor}
          threadToken={threadToken}
        />
      ))}
    </div>
  );
}
