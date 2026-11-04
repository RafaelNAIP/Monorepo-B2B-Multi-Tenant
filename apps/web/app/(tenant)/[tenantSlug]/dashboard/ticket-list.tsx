"use client";

import {
  Badge,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui";

import type { Ticket } from "@/lib/tickets/types";
import { ticketStatusVariant, priorityVariant } from "@/lib/shared/badge-variants";
import { FilterSelect } from "@/components/filter-select";
import { useTicketFilters } from "@/hooks/use-ticket-filters";
import { TICKET_STATUS, TICKET_PRIORITY } from "@/lib/tickets/constants";
import type { TicketStatus } from "@/lib/tickets/constants";

interface TicketListProps {
  /** Página já filtrada e paginada pelo servidor */
  tickets: Ticket[];
  tenantSlug: string;
  initialStatus?: TicketStatus;
  initialSearch?: string;
}

const ALL_STATUS = "todos";

export function TicketList({ tickets, initialStatus, initialSearch }: TicketListProps) {
  const { status, changeStatus, search, changeSearch } = useTicketFilters({
    initialStatus,
    initialSearch,
    allValue: ALL_STATUS,
  });

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterSelect
          value={status}
          onChange={changeStatus}
          ariaLabel="Filtrar por status"
          allValue={ALL_STATUS}
          allLabel="Todos os status"
          options={Object.entries(TICKET_STATUS)}
        />

        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar por título ou solicitante..."
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Ticket table ── */}
      {tickets.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] p-8 text-center text-[var(--color-muted-foreground)]">
          Nenhum chamado encontrado.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-28">Prioridade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-xs text-[var(--color-muted-foreground)]">
                  {ticket.id}
                </TableCell>
                <TableCell className="font-medium">{ticket.title}</TableCell>
                <TableCell>{ticket.requester}</TableCell>
                <TableCell>
                  <Badge variant={ticketStatusVariant(ticket.status)}>
                    {TICKET_STATUS[ticket.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={priorityVariant(ticket.priority)}>
                    {TICKET_PRIORITY[ticket.priority]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
