import { SENDER_ROLE } from "@/lib/messages/constants";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/tenants/constants";
import type { Message } from "@/lib/messages/types";

interface ChatBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  primaryColor?: string;
}

/**
 * Bolha de mensagem — alinhada à direita se é do remetente atual,
 * à esquerda caso contrário.
 */
export function ChatBubble({
  message,
  isOwnMessage,
  primaryColor = DEFAULT_PRIMARY_COLOR,
}: ChatBubbleProps) {
  const roleLabel = SENDER_ROLE[message.senderRole];
  const time = new Date(message.createdAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOwnMessage
            ? "text-white"
            : "bg-[var(--color-muted,#f1f5f9)] text-[var(--color-foreground)]"
        }`}
        style={isOwnMessage ? { backgroundColor: primaryColor } : undefined}
      >
        <div className="mb-1 flex items-baseline gap-2">
          <span
            className={`text-xs font-semibold ${
              isOwnMessage ? "text-white/80" : "text-[var(--color-muted-foreground)]"
            }`}
          >
            {message.senderName}
          </span>
          <span
            className={`text-[10px] ${
              isOwnMessage ? "text-white/60" : "text-[var(--color-muted-foreground)]"
            }`}
          >
            {roleLabel}
          </span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p
          className={`mt-1 text-right text-[10px] ${
            isOwnMessage ? "text-white/60" : "text-[var(--color-muted-foreground)]"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
