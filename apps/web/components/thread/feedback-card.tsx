"use client";

import { useActionState } from "react";

import { submitFeedbackAction, type MessageActionState } from "@/lib/messages/actions";
import { INITIAL_ACTION_STATE } from "@/lib/shared/action-state";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/tenants/constants";
import type { Ticket } from "@/lib/tickets/types";

interface FeedbackCardProps {
  ticket: Ticket;
  tenantSlug: string;
  primaryColor?: string;
}

const initialState: MessageActionState = INITIAL_ACTION_STATE;

/**
 * Card de feedback — exibido para o cliente quando o admin desconecta.
 * Pergunta se o problema foi resolvido ou não.
 */
export function FeedbackCard({
  ticket,
  tenantSlug,
  primaryColor = DEFAULT_PRIMARY_COLOR,
}: FeedbackCardProps) {
  const [state, formAction, isPending] = useActionState(
    submitFeedbackAction,
    initialState
  );

  // Calcula tempo restante
  const deadline = ticket.feedbackDeadline
    ? new Date(ticket.feedbackDeadline)
    : null;
  const now = new Date();
  const hoursLeft = deadline
    ? Math.max(0, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)))
    : 0;

  if (state.success) {
    return (
      <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          Obrigado pelo seu feedback! O chamado foi atualizado.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-6">
      <div className="text-center">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          O atendente encerrou a conversa
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Seu problema foi resolvido?
        </p>
        {hoursLeft > 0 && (
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Você tem {hoursLeft}h para responder. Após isso, o chamado será fechado automaticamente como resolvido.
          </p>
        )}
      </div>

      {state.error && (
        <p className="mt-3 text-center text-sm text-[var(--color-destructive)]">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-center gap-3">
        <form action={formAction}>
          <input type="hidden" name="ticketId" value={ticket.id} />
          <input type="hidden" name="resolution" value="resolved" />
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {isPending ? "..." : "Sim, resolvido"}
          </button>
        </form>

        <form action={formAction}>
          <input type="hidden" name="ticketId" value={ticket.id} />
          <input type="hidden" name="resolution" value="unresolved" />
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-5 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] disabled:opacity-50"
          >
            {isPending ? "..." : "Não, ainda preciso de ajuda"}
          </button>
        </form>
      </div>
    </div>
  );
}
