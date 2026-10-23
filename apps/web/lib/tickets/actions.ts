"use server";

import { revalidatePath } from "next/cache";

import { createTicketSchema, assignTicketSchema } from "./schemas";
import { createTicket, assignTicket } from "./data";

export interface TicketActionState {
  success: boolean;
  error: string | null;
  fieldErrors: Record<string, string[]>;
}

export async function createTicketAction(
  _prevState: TicketActionState,
  formData: FormData
): Promise<TicketActionState> {
  const raw = {
    title: formData.get("title") as string,
    category: formData.get("category") as string,
    description: formData.get("description") as string,
    attachment: (formData.get("attachment") as string) || undefined,
  };

  const parsed = createTicketSchema.safeParse(raw);

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      success: false,
      error: "Verifique os campos e tente novamente.",
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    };
  }

  const tenantId = formData.get("tenantId") as string;
  const requester = formData.get("requester") as string;

  createTicket({
    title: parsed.data.title,
    category: parsed.data.category,
    description: parsed.data.description,
    tenantId,
    requester,
  });

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
  const result = assignTicket(parsed.data.ticketId, parsed.data.adminUserId);

  if (!result) {
    return {
      success: false,
      error: "Chamado não encontrado ou não está aberto para atribuição.",
    };
  }

  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}/admin/chamados`);
  }

  return {
    success: true,
    error: null,
  };
}
