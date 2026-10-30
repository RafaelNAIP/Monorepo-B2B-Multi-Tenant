import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getThreadAccessByToken } from "@/lib/messages/data";
import { getMessagesByTicket } from "@/lib/messages/data";
import { getTicketById, checkAutoClose } from "@/lib/tickets/data";
import { getTenantBySlug } from "@/lib/tenants/data";

import { ThreadHeader } from "@/components/thread/thread-header";
import { ClientThreadView } from "./client-thread-view";

interface ThreadPageProps {
  params: Promise<{ tenantSlug: string; token: string }>;
}

export async function generateMetadata({
  params,
}: ThreadPageProps): Promise<Metadata> {
  const { tenantSlug, token } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  const access = await getThreadAccessByToken(token);

  if (!tenant || !access) {
    return { title: "Thread não encontrada" };
  }

  const ticket = await getTicketById(access.ticketId);
  return {
    title: ticket ? `${ticket.title} — ${tenant.name}` : "Thread",
  };
}

export default async function ClientThreadPage({ params }: ThreadPageProps) {
  const { tenantSlug, token } = await params;

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const access = await getThreadAccessByToken(token);
  if (!access || access.tenantId !== tenant.id) {
    notFound();
  }

  // Check-on-access: auto-close se deadline expirou
  await checkAutoClose(access.ticketId);

  const ticket = await getTicketById(access.ticketId);
  if (!ticket) {
    notFound();
  }

  const messages = await getMessagesByTicket(access.ticketId);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <ThreadHeader tenant={tenant} ticket={ticket} />

      <ClientThreadView
        ticket={ticket}
        messages={messages}
        tenant={tenant}
        tenantSlug={tenantSlug}
        clientName={access.clientName}
        threadToken={token}
      />
    </div>
  );
}
