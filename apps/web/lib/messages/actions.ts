"use server";

import { revalidatePath } from "next/cache";

import { createMessageSchema, createThreadAccessSchema, feedbackSchema } from "./schemas";
import { createMessage, createThreadAccess, getMessagesByTicket } from "./data";
import { submitTicketFeedback, getTicketById } from "@/lib/tickets/data";
import {
  validationErrorState,
  type ActionState,
} from "@/lib/shared/action-state";
import { notifyThread } from "@/lib/sse/thread-event-emitter";
import { ATTACHMENTS_INVALID } from "@/lib/attachments/data";
import { ATTACHMENTS_INVALID_MESSAGE, parseAttachmentKeysField } from "@/lib/attachments/form";
import type { Message } from "./types";
import type { Ticket } from "@/lib/tickets/types";

// ─── Types ──────────────────────────────────────────────────────

export type MessageActionState = ActionState & {
  threadToken?: string;
};

// ─── Snapshot da thread (usado pelo canal SSE e pelo polling de segurança) ──

export interface ThreadPollResult {
  messages: Message[];
  ticket: Ticket | null;
}

/**
 * Retorna as mensagens e o status atual do ticket.
 * O SSE só avisa que algo mudou; este é o fetch que traz o estado novo
 * (também chamado pelo polling de segurança quando o SSE está fora do ar).
 */
export async function pollThreadMessages(
  ticketId: string
): Promise<ThreadPollResult> {
  const messages = await getMessagesByTicket(ticketId);
  const ticket = (await getTicketById(ticketId)) ?? null;
  return { messages, ticket };
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
    attachmentKeys: parseAttachmentKeysField(formData.get("attachmentKeys")),
  };

  const parsed = createMessageSchema.safeParse(raw);

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await createMessage({
      ticketId: parsed.data.ticketId,
      tenantId: parsed.data.tenantId,
      senderRole: parsed.data.senderRole,
      senderName: parsed.data.senderName,
      content: parsed.data.content,
      attachmentKeys: parsed.data.attachmentKeys,
    });
  } catch (error) {
    if (error instanceof Error && error.message === ATTACHMENTS_INVALID) {
      return { success: false, error: ATTACHMENTS_INVALID_MESSAGE, fieldErrors: {} };
    }
    throw error;
  }

  notifyThread(parsed.data.ticketId, "new_message");

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
    return validationErrorState(parsed.error);
  }

  const access = await createThreadAccess({
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
    return validationErrorState(parsed.error);
  }

  const result = await submitTicketFeedback(parsed.data.ticketId, parsed.data.resolution);

  if (!result) {
    return {
      success: false,
      error: "Chamado não encontrado ou não está aguardando feedback.",
      fieldErrors: {},
    };
  }

  notifyThread(parsed.data.ticketId, "ticket_updated");

  const tenantSlug = formData.get("tenantSlug") as string;
  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}/thread`);
    revalidatePath(`/${tenantSlug}/admin/chamados`);
    revalidatePath(`/${tenantSlug}/admin/chamados/${parsed.data.ticketId}`);
  }

  return {
    success: true,
    error: null,
    fieldErrors: {},
  };
}
