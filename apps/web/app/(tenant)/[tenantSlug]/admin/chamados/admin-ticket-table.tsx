"use client";

import { useState, useMemo, useActionState } from "react";
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
import { TICKET_STATUS, TICKET_PRIORITY } from "@/lib/tickets/constants";
import type { TicketStatus, TicketPriority } from "@/lib/tickets/constants";
import {
  assignTicketAction,
  type AssignTicketActionState,
} from "@/lib/tickets/actions";

interface AdminTicketTableProps {
  tickets: Ticket[];
  assignedNames: Record<string, string>;
  adminUserId: string;
  tenantSlug: string;
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
}: AdminTicketTableProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);
  const [assignState, assignAction, isAssigning] = useActionState(
    assignTicketAction,
    assignInitialState
  );

  const filteredTickets = useMemo(() => {
    const normalizedSearch = searchText.toLowerCase().trim();

    return tickets.filter((ticket) => {
      const matchesText =
        normalizedSearch === "" ||
        ticket.title.toLowerCase().includes(normalizedSearch) ||
        ticket.requester.toLowerCase().includes(normalizedSearch) ||
        ticket.category.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === ALL_STATUS || ticket.status === statusFilter;

      return matchesText && matchesStatus;
    });
  }, [tickets, searchText, statusFilter]);

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
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Buscar chamados"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por status"
            className="flex h-10 w-full items-center rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
          >
            <option value={ALL_STATUS}>Todos os status</option>
            {(
              Object.entries(TICKET_STATUS) as [TicketStatus, string][]
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tabela ── */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] p-8 text-center text-[var(--color-muted-foreground)]">
          {tickets.length === 0
            ? "Nenhum chamado encontrado para esta empresa."
            : "Nenhum chamado encontrado com os filtros aplicados."}
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
              {filteredTickets.map((ticket) => (
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

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {filteredTickets.length === tickets.length
          ? `${tickets.length} chamado(s)`
          : `${filteredTickets.length} de ${tickets.length} chamado(s)`}
      </p>
    </div>
  );
}
