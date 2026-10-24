import type { Tenant } from "@/lib/tenants/types";
import type { Ticket } from "@/lib/tickets/types";
import { TICKET_STATUS } from "@/lib/tickets/constants";

interface ThreadHeaderProps {
  tenant: Tenant;
  ticket: Ticket;
}

/**
 * Cabeçalho da thread — exibe marca do tenant (iniciais como mock de logo)
 * e informações do chamado.
 */
export function ThreadHeader({ tenant, ticket }: ThreadHeaderProps) {
  // Mock de logo com iniciais
  const initials = tenant.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      className="border-b border-[var(--color-border)] bg-[var(--color-background)]"
      style={{ borderTopColor: tenant.theme.primaryColor, borderTopWidth: 3 }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
        {/* Mock logo com iniciais */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{
            backgroundColor: tenant.theme.primaryColor,
            borderRadius: tenant.theme.borderRadius,
          }}
          aria-label={`Logo da ${tenant.name}`}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-[var(--color-foreground)]">
            {ticket.title}
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {tenant.name} · {TICKET_STATUS[ticket.status]}
          </p>
        </div>
      </div>
    </header>
  );
}
