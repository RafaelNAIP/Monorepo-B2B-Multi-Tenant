"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui";

import type { Ticket } from "@/lib/tickets/types";
import { FilterSelect } from "@/components/filter-select";
import { useTicketFilters } from "@/hooks/use-ticket-filters";
import { TICKET_STATUS, TICKET_PRIORITY } from "@/lib/tickets/constants";
import type { TicketStatus, TicketPriority } from "@/lib/tickets/constants";
import {
  assignTicketAction,
  type AssignTicketActionState,
} from "@/lib/tickets/actions";

interface AdminTicketTableProps {
  /** Página já filtrada e paginada pelo servidor */
  tickets: Ticket[];
  assignedNames: Record<string, string>;
  adminUserId: string;
  tenantSlug: string;
  initialStatus?: TicketStatus;
  initialSearch?: string;
}

const ALL_STATUS = "all";

const assignInitialState: AssignTicketActionState = {
  success: false,
  error: null,
};

export function AdminTicketTable({
  tickets,
  assignedNames,
  adminUserId,
  tenantSlug,
  initialStatus,
  initialSearch,
}: AdminTicketTableProps) {
  const { status, changeStatus, search, changeSearch } = useTicketFilters({
    initialStatus,
    initialSearch,
    allValue: ALL_STATUS,
  });
  const hasFilters = Boolean(initialStatus || initialSearch);
  const [assignState, assignAction, isAssigning] = useActionState(
    assignTicketAction,
    assignInitialState
  );

  return (
    <div className="space-y-4">
      {/* ── Feedback ── */}
      {assignState.success && (
        <div
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
        >
          Chamado assumido com sucesso!
        </div>
      )}

      {assignState.error && (
        <div
          role="alert"
          className="rounded border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 p-3 text-sm text-[var(--color-destructive)]"
        >
          {assignState.error}
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar por título, solicitante ou categoria..."
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            aria-label="Buscar chamados"
          />
        </div>
        <FilterSelect
          value={status}
          onChange={changeStatus}
          ariaLabel="Filtrar por status"
          allValue={ALL_STATUS}
          allLabel="Todos os status"
          options={Object.entries(TICKET_STATUS)}
        />
      </div>

      {/* ── Tabela ── */}
      {tickets.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] p-8 text-center text-[var(--color-muted-foreground)]">
          {hasFilters
            ? "Nenhum chamado encontrado com os filtros aplicados."
            : "Nenhum chamado encontrado para esta empresa."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead className="w-36">Solicitante</TableHead>
                <TableHead className="w-36">Categoria</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24">Prioridade</TableHead>
                <TableHead className="w-32">Responsável</TableHead>
                <TableHead className="w-36">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {ticket.requester}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                    {ticket.category}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ticket.status as TicketStatus}>
                      {TICKET_STATUS[ticket.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ticket.priority as TicketPriority}>
                      {TICKET_PRIORITY[ticket.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {ticket.assignedTo
                      ? assignedNames[ticket.assignedTo] ?? "—"
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {ticket.status === "open" ? (
                        <form action={assignAction}>
                          <input
                            type="hidden"
                            name="ticketId"
                            value={ticket.id}
                          />
                          <input
                            type="hidden"
                            name="adminUserId"
                            value={adminUserId}
                          />
                          <input
                            type="hidden"
                            name="tenantSlug"
                            value={tenantSlug}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isAssigning}
                          >
                            {isAssigning ? "..." : "Assumir"}
                          </Button>
                        </form>
                      ) : null}
                      <Link
                        href={`/${tenantSlug}/admin/chamados/${ticket.id}`}
                        className="inline-flex h-8 items-center rounded-md bg-[var(--color-primary,#2563eb)] px-3 text-xs font-medium text-white transition-colors hover:opacity-90"
                      >
                        Ver
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
