"use server";

import { revalidatePath } from "next/cache";

import { createMessageSchema, createThreadAccessSchema, feedbackSchema } from "./schemas";
import { createMessage, createThreadAccess, getMessagesByTicket } from "./data";
import { submitTicketFeedback, getTicketById } from "@/lib/tickets/data";
import {
  validationErrorState,
  type ActionState,
} from "@/lib/shared/action-state";
import type { Message } from "./types";
import type { Ticket } from "@/lib/tickets/types";

// ─── Types ──────────────────────────────────────────────────────

export type MessageActionState = ActionState & {
  threadToken?: string;
};

// ─── Polling action (atualização em tempo real para mock) ──────

export interface ThreadPollResult {
  messages: Message[];
  ticket: Ticket | null;
}

/**
 * Server Action para polling — retorna mensagens e status atual do ticket.
 * Usada pelos componentes client para atualizar a thread sem reload.
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
  };

  const parsed = createMessageSchema.safeParse(raw);

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  await createMessage({
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
