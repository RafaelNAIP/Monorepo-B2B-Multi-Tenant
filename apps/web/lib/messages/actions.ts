"use server";

import { revalidatePath } from "next/cache";

import { createMessageSchema, createThreadAccessSchema, feedbackSchema } from "./schemas";
import { createMessage, createThreadAccess } from "./data";

// ─── Types ──────────────────────────────────────────────────────

export interface MessageActionState {
  success: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]>;
  threadToken?: string;
}

// ─── sendMessageAction ──────────────────────────────────────────

export async function sendMessageAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const raw = {
    ticketId: formData.get("ticketId") as string,
    tenantId: formData.get("tenantId") as string,
    senderRole: formData.get("senderRole") as string,
    senderName: formData.get("senderName") as string,
    content: formData.get("content") as string,
  };

  const parsed = createMessageSchema.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      success: false,
      error: "Verifique os campos e tente novamente.",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  createMessage({
    ticketId: parsed.data.ticketId,
    tenantId: parsed.data.tenantId,
    senderRole: parsed.data.senderRole,
    senderName: parsed.data.senderName,
    content: parsed.data.content,
  });

  const tenantSlug = formData.get("tenantSlug") as string;
  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}/admin/chamados`);
  }

  return {
    success: true,
    error: null,
    fieldErrors: {},
  };
}

// ─── createThreadAccessAction ───────────────────────────────────

export async function createThreadAccessAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const raw = {
    ticketId: formData.get("ticketId") as string,
    tenantId: formData.get("tenantId") as string,
    clientName: formData.get("clientName") as string,
    clientEmail: formData.get("clientEmail") as string,
  };

  const parsed = createThreadAccessSchema.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      success: false,
      error: "Verifique os campos e tente novamente.",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  const access = createThreadAccess({
    ticketId: parsed.data.ticketId,
    tenantId: parsed.data.tenantId,
    clientName: parsed.data.clientName,
    clientEmail: parsed.data.clientEmail,
  });

  const tenantSlug = formData.get("tenantSlug") as string;
  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}/admin/chamados`);
  }

  return {
    success: true,
    error: null,
    fieldErrors: {},
    threadToken: access.token,
  };
}

// ─── submitFeedbackAction ───────────────────────────────────────

export async function submitFeedbackAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const raw = {
    ticketId: formData.get("ticketId") as string,
    resolution: formData.get("resolution") as string,
  };

  const parsed = feedbackSchema.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      success: false,
      error: "Verifique os campos e tente novamente.",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  // TODO: Integrar com ticket domain (Task 5) — atualizar status do ticket
  // Se resolved → marcar ticket como "resolved"
  // Se unresolved → sinalizar para criar novo ticket com relatedTicketId

  const tenantSlug = formData.get("tenantSlug") as string;
  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}/thread`);
  }

  return {
    success: true,
    error: null,
    fieldErrors: {},
  };
}
