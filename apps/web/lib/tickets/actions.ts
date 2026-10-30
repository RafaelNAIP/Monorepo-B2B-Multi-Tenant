"use server";

import { revalidatePath } from "next/cache";

import {
  validationErrorState,
  type ActionState,
} from "@/lib/shared/action-state";

import { createTicketSchema, assignTicketSchema } from "./schemas";
import { createTicket, assignTicket, disconnectTicket } from "./data";
import { notifyThread } from "@/lib/sse/thread-event-emitter";
import { ATTACHMENTS_INVALID } from "@/lib/attachments/data";
import { ATTACHMENTS_INVALID_MESSAGE, parseAttachmentKeysField } from "@/lib/attachments/form";

export async function createTicketAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const rawAttachmentKeys = formData.get("attachmentKeys");
  const parsedKeys = parseAttachmentKeysField(rawAttachmentKeys);
  console.log("[DEBUG createTicket] rawAttachmentKeys:", rawAttachmentKeys);
  console.log("[DEBUG createTicket] parsedKeys:", parsedKeys);

  const raw = {
    title: formData.get("title") as string,
    category: formData.get("category") as string,
    description: formData.get("description") as string,
    attachmentKeys: parsedKeys,
  };

  const parsed = createTicketSchema.safeParse(raw);

  if (!parsed.success) {
    console.log("[DEBUG createTicket] validation errors:", JSON.stringify(parsed.error.flatten()));
    return validationErrorState(parsed.error);
  }

  const tenantId = formData.get("tenantId") as string;
  const requester = formData.get("requester") as string;
  console.log("[DEBUG createTicket] tenantId:", tenantId);
  console.log("[DEBUG createTicket] attachmentKeys:", parsed.data.attachmentKeys);

  try {
    await createTicket({
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      tenantId,
      requester,
      attachmentKeys: parsed.data.attachmentKeys,
    });
  } catch (error) {
    console.error("[DEBUG createTicket] error:", error);
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

  const tenantSlug = formData.get("tenantSlug") as string;
  const result = await assignTicket(parsed.data.ticketId, parsed.data.adminUserId);

  if (!result) {
    return {
      success: false,
      error: "Chamado não encontrado ou não está aberto para atribuição.",
    };
  }

  notifyThread(parsed.data.ticketId, "ticket_updated");

  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}/admin/chamados`);
  }

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
  const ticketId = formData.get("ticketId") as string;
  const tenantSlug = formData.get("tenantSlug") as string;

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

  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}/admin/chamados`);
    revalidatePath(`/${tenantSlug}/admin/chamados/${ticketId}`);
  }

  return {
    success: true,
    error: null,
  };
}
