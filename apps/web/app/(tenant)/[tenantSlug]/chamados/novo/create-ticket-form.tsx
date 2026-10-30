"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Input, Label } from "@empresa/ui";

import { FileUploader } from "@/components/shared/file-uploader";

import { createTicketAction } from "@/lib/tickets/actions";
import { INITIAL_ACTION_STATE } from "@/lib/shared/action-state";
import { TICKET_CATEGORIES } from "@/lib/tickets/constants";

interface CreateTicketFormProps {
  tenantSlug: string;
  tenantId: string;
  requester: string;
}

export function CreateTicketForm({
  tenantSlug,
  tenantId,
  requester,
}: CreateTicketFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createTicketAction,
    INITIAL_ACTION_STATE
  );
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);

  // Redirect on success
  useEffect(() => {
    if (state.success) {
      router.push(`/${tenantSlug}/dashboard`);
    }
  }, [state.success, tenantSlug, router]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="requester" value={requester} />

      {/* Global error */}
      {state.error && !state.success && (
        <div
          role="alert"
          className="rounded-md border border-[var(--color-destructive)] bg-red-50 p-3 text-sm text-[var(--color-destructive)] dark:bg-red-950/20"
        >
          {state.error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          placeholder="Descreva brevemente o problema..."
          error={!!state.fieldErrors.title}
          aria-describedby={
            state.fieldErrors.title ? "title-error" : undefined
          }
        />
        {state.fieldErrors.title && (
          <p id="title-error" className="text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.title[0]}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-describedby={
            state.fieldErrors.category ? "category-error" : undefined
          }
          className={`flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm text-[var(--color-foreground)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 ${
            state.fieldErrors.category
              ? "border-[var(--color-destructive)]"
              : "border-[var(--color-border)]"
          }`}
        >
          <option value="">Selecione uma categoria</option>
          {TICKET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {state.fieldErrors.category && (
          <p
            id="category-error"
            className="text-sm text-[var(--color-destructive)]"
          >
            {state.fieldErrors.category[0]}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <textarea
          id="description"
          name="description"
          placeholder="Descreva o problema com o máximo de detalhes possível..."
          rows={5}
          aria-describedby={
            state.fieldErrors.description ? "description-error" : undefined
          }
          className={`flex w-full rounded-md border px-3 py-2 text-sm text-[var(--color-foreground)] bg-[var(--color-background)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 ${
            state.fieldErrors.description
              ? "border-[var(--color-destructive)]"
              : "border-[var(--color-border)]"
          }`}
        />
        {state.fieldErrors.description && (
          <p
            id="description-error"
            className="text-sm text-[var(--color-destructive)]"
          >
            {state.fieldErrors.description[0]}
          </p>
        )}
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <FileUploader onUploadingChange={setUploading} />
        {state.fieldErrors.attachmentKeys && (
          <p role="alert" className="text-sm text-[var(--color-destructive)]">
            {state.fieldErrors.attachmentKeys[0]}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending || uploading}>
          {isPending ? "Criando..." : uploading ? "Enviando anexos..." : "Criar Chamado"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/${tenantSlug}/dashboard`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
