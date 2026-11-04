"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@empresa/auth";

import {
  validationErrorState,
  type ActionState,
} from "@/lib/shared/action-state";

import { createTicketSchema, assignTicketSchema } from "./schemas";
import { createTicket, assignTicket, disconnectTicket } from "./data";
import { notifyThread } from "@/lib/sse/channel-singleton";
import { ATTACHMENTS_INVALID } from "@/lib/attachments/data";
import { ATTACHMENTS_INVALID_MESSAGE, parseAttachmentKeysField } from "@/lib/attachments/form";

export async function createTicketAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await requireSession();
  if (!result.ok) return result.errorState;
  const { session } = result;

  const raw = {
    title: formData.get("title") as string,
    category: formData.get("category") as string,
    description: formData.get("description") as string,
    attachmentKeys: parseAttachmentKeysField(formData.get("attachmentKeys")),
  };

  const parsed = createTicketSchema.safeParse(raw);

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  // tenantId e requester vêm da sessão, nunca do FormData
  try {
    await createTicket({
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      tenantId: session.tenantId,
      requester: session.name,
      attachmentKeys: parsed.data.attachmentKeys,
    });
  } catch (error) {
    if (error instanceof Error && error.message === ATTACHMENTS_INVALID) {
      return { success: false, error: ATTACHMENTS_INVALID_MESSAGE, fieldErrors: {} };
    }
    throw error;
  }

  return {
    success: true,
    error: null,
    fieldErrors: {},
  };
}

// ─── Assign Ticket Action ────────────────────────────────────────

export interface AssignTicketActionState {
  success: boolean;
  error: string | null;
}

export async function assignTicketAction(
  _prevState: AssignTicketActionState,
  formData: FormData
): Promise<AssignTicketActionState> {
  const authResult = await requireSession({ role: "admin" });
  if (!authResult.ok) return { success: false, error: authResult.errorState.error };
  const { session } = authResult;

  const raw = {
    ticketId: formData.get("ticketId") as string,
    adminUserId: formData.get("adminUserId") as string,
  };

  const parsed = assignTicketSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos para atribuição do chamado.",
    };
  }

  const result = await assignTicket(parsed.data.ticketId, parsed.data.adminUserId);

  if (!result) {
    return {
      success: false,
      error: "Chamado não encontrado ou não está aberto para atribuição.",
    };
  }

  notifyThread(parsed.data.ticketId, "ticket_updated");

  revalidatePath(`/${session.tenantSlug}/admin/chamados`);

  return {
    success: true,
    error: null,
  };
}

// ─── Disconnect Ticket Action ───────────────────────────────────

export async function disconnectTicketAction(
  _prevState: AssignTicketActionState,
  formData: FormData
): Promise<AssignTicketActionState> {
  const authResult = await requireSession({ role: "admin" });
  if (!authResult.ok) return { success: false, error: authResult.errorState.error };
  const { session } = authResult;

  const ticketId = formData.get("ticketId") as string;

  if (!ticketId) {
    return {
      success: false,
      error: "ID do chamado é obrigatório.",
    };
  }

  const result = await disconnectTicket(ticketId);

  if (!result) {
    return {
      success: false,
      error: "Chamado não encontrado ou não está em andamento.",
    };
  }

  notifyThread(ticketId, "thread_disconnected");

  revalidatePath(`/${session.tenantSlug}/admin/chamados`);
  revalidatePath(`/${session.tenantSlug}/admin/chamados/${ticketId}`);

  return {
    success: true,
    error: null,
  };
}
