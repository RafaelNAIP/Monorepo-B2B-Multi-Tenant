"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@empresa/auth";

import { createMessageSchema, createThreadAccessSchema, feedbackSchema } from "./schemas";
import { createMessage, createThreadAccess, getMessagesByTicket } from "./data";
import { submitTicketFeedback, getTicketById } from "@/lib/tickets/data";
import {
  validationErrorState,
  type ActionState,
} from "@/lib/shared/action-state";
import { notifyThread } from "@/lib/sse/channel-singleton";
import { ATTACHMENTS_INVALID } from "@/lib/attachments/data";
import { ATTACHMENTS_INVALID_MESSAGE, parseAttachmentKeysField } from "@/lib/attachments/form";
import { resolveThreadActor } from "./actor";
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
 *
 * Autenticação via sessão (admin) ou threadToken (client).
 */
export async function pollThreadMessages(
  ticketId: string,
  threadToken?: string | null
): Promise<ThreadPollResult> {
  const auth = await resolveThreadActor(ticketId, threadToken);
  if (!auth.ok) {
    return { messages: [], ticket: null };
  }

  const messages = await getMessagesByTicket(ticketId);
  const ticket = (await getTicketById(ticketId)) ?? null;
  return { messages, ticket };
}

// ─── sendMessageAction ──────────────────────────────────────────

export async function sendMessageAction(
  _prevState: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const ticketId = formData.get("ticketId") as string;
  const threadToken = formData.get("threadToken") as string | null;

  // Identidade vem de credenciais (sessão ou threadToken), nunca do FormData
  const auth = await resolveThreadActor(ticketId, threadToken);
  if (!auth.ok) {
    return { success: false, error: auth.message, fieldErrors: {} };
  }

  const { actor } = auth;
  const tenantId = actor.tenantId;
  const senderRole = actor.kind;
  const senderName = actor.kind === "admin" ? actor.name : actor.clientName;

  const raw = {
    ticketId,
    tenantId,
    senderRole,
    senderName,
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

  if (actor.kind === "admin") {
    revalidatePath(`/${actor.tenantSlug}/admin/chamados`);
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
  // Somente admin pode criar acesso a thread
  const authResult = await requireSession({ role: "admin" });
  if (!authResult.ok) return authResult.errorState;
  const { session } = authResult;

  const raw = {
    ticketId: formData.get("ticketId") as string,
    tenantId: session.tenantId,
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

  revalidatePath(`/${session.tenantSlug}/admin/chamados`);

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
  const ticketId = formData.get("ticketId") as string;
  const threadToken = formData.get("threadToken") as string | null;

  // Feedback pode vir de client (via threadToken) ou admin (via sessão)
  const auth = await resolveThreadActor(ticketId, threadToken);
  if (!auth.ok) {
    return { success: false, error: auth.message, fieldErrors: {} };
  }

  const raw = {
    ticketId,
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

  // Revalidate com base no tipo de ator
  if (auth.actor.kind === "admin") {
    revalidatePath(`/${auth.actor.tenantSlug}/admin/chamados`);
    revalidatePath(`/${auth.actor.tenantSlug}/admin/chamados/${parsed.data.ticketId}`);
  }

  return {
    success: true,
    error: null,
    fieldErrors: {},
  };
}
