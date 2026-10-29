"use client";

import { useState, useActionState } from "react";

import {
  createThreadAccessAction,
  type MessageActionState,
} from "@/lib/messages/actions";
import { INITIAL_ACTION_STATE } from "@/lib/shared/action-state";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/tenants/constants";
import type { Ticket } from "@/lib/tickets/types";

interface AdminThreadActionsProps {
  ticket: Ticket;
  tenantSlug: string;
  existingToken?: string;
  primaryColor?: string;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  /** false enquanto o cliente não se conectar e não houver 3 min de inatividade */
  canDisconnect: boolean;
}

const initialState: MessageActionState = INITIAL_ACTION_STATE;

/**
 * Ações do admin na thread: gerar link público para o cliente e encerrar conversa.
 */
export function AdminThreadActions({
  ticket,
  tenantSlug,
  existingToken,
  primaryColor = DEFAULT_PRIMARY_COLOR,
  onDisconnect,
  isDisconnecting,
  canDisconnect,
}: AdminThreadActionsProps) {
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(
    existingToken
      ? `/${tenantSlug}/thread/${existingToken}`
      : ""
  );
  const [linkState, linkAction, isGenerating] = useActionState(
    async (prev: MessageActionState, formData: FormData) => {
      const result = await createThreadAccessAction(prev, formData);
      if (result.success && result.threadToken) {
        setGeneratedLink(`/${tenantSlug}/thread/${result.threadToken}`);
      }
      return result;
    },
    initialState
  );

  const isActive = ticket.status === "in_progress";
  const isPendingFeedback = ticket.status === "pending_feedback";

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
        {/* Gerar link público */}
        {isActive && !generatedLink && (
          <button
            type="button"
            onClick={() => setShowLinkForm(!showLinkForm)}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
          >
            Gerar link para cliente
          </button>
        )}

        {/* Link já gerado */}
        {generatedLink && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Link público:
            </span>
            <code className="rounded bg-[var(--color-muted,#f1f5f9)] px-2 py-0.5 text-xs text-[var(--color-foreground)]">
              {generatedLink}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${typeof window !== "undefined" ? window.location.origin : ""}${generatedLink}`
                );
              }}
              className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
            >
              Copiar
            </button>
          </div>
        )}

        {/* Botão de desconectar */}
        {isActive && (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={isDisconnecting || !canDisconnect}
            title={
              canDisconnect
                ? "Encerrar conversa com o cliente"
                : "Aguarde o cliente se conectar ou 3 min de inatividade"
            }
            className="ml-auto rounded-md bg-[var(--color-destructive,#dc2626)] px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
          >
            {isDisconnecting ? "Encerrando..." : "Encerrar conversa"}
          </button>
        )}

        {isPendingFeedback && (
          <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
            Aguardando feedback do cliente...
          </span>
        )}
      </div>

      {/* Formulário de geração de link */}
      {showLinkForm && (
        <div className="mx-auto mt-3 max-w-3xl">
          {linkState.error && (
            <p className="mb-2 text-xs text-[var(--color-destructive)]">
              {linkState.error}
            </p>
          )}
          <form action={linkAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="tenantId" value={ticket.tenantId} />
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input
              name="clientName"
              placeholder="Nome do cliente"
              required
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              aria-label="Nome do cliente"
            />
            <input
              name="clientEmail"
              type="email"
              placeholder="E-mail do cliente"
              required
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              aria-label="E-mail do cliente"
            />
            <button
              type="submit"
              disabled={isGenerating}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {isGenerating ? "Gerando..." : "Gerar link"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
