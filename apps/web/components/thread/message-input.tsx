"use client";

import { useActionState, useRef, useEffect } from "react";

import { sendMessageAction, type MessageActionState } from "@/lib/messages/actions";
import { INITIAL_ACTION_STATE } from "@/lib/shared/action-state";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/tenants/constants";

interface MessageInputProps {
  ticketId: string;
  tenantId: string;
  senderRole: "admin" | "client";
  senderName: string;
  tenantSlug: string;
  primaryColor?: string;
  disabled?: boolean;
}

const initialState: MessageActionState = INITIAL_ACTION_STATE;

/**
 * Campo de envio de mensagem — usa Server Action via useActionState.
 * Limpa o campo automaticamente após envio com sucesso.
 */
export function MessageInput({
  ticketId,
  tenantId,
  senderRole,
  senderName,
  tenantSlug,
  primaryColor = DEFAULT_PRIMARY_COLOR,
  disabled = false,
}: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [state, formAction, isPending] = useActionState(
    sendMessageAction,
    initialState
  );

  // Limpa o campo após envio com sucesso
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [state]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-background)] p-4">
      {state.error && (
        <p className="mb-2 text-sm text-[var(--color-destructive)]">
          {state.error}
        </p>
      )}

      <form ref={formRef} action={formAction} className="flex gap-2">
        <input type="hidden" name="ticketId" value={ticketId} />
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="senderRole" value={senderRole} />
        <input type="hidden" name="senderName" value={senderName} />
        <input type="hidden" name="tenantSlug" value={tenantSlug} />

        <textarea
          ref={inputRef}
          name="content"
          rows={1}
          placeholder={disabled ? "Conversa encerrada" : "Digite sua mensagem..."}
          disabled={disabled || isPending}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Mensagem"
        />

        <button
          type="submit"
          disabled={disabled || isPending}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
        >
          {isPending ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
