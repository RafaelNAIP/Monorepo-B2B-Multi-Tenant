"use client";

import { useState } from "react";

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
import { TICKET_STATUS, TICKET_PRIORITY } from "@/lib/tickets/constants";
import type { TicketStatus } from "@/lib/tickets/constants";

interface TicketListProps {
  tickets: Ticket[];
  tenantSlug: string;
}

export function TicketList({ tickets, tenantSlug }: TicketListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchText, setSearchText] = useState("");

  const filteredTickets = tickets.filter((ticket) => {
    // Status filter
    if (statusFilter !== "todos" && ticket.status !== statusFilter) {
      return false;
    }

    // Search filter (title and requester)
    if (searchText.trim() !== "") {
      const term = searchText.toLowerCase();
      const matchTitle = ticket.title.toLowerCase().includes(term);
      const matchRequester = ticket.requester.toLowerCase().includes(term);
      if (!matchTitle && !matchRequester) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por status"
            className="flex h-10 w-full items-center rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
          >
            <option value="todos">Todos os status</option>
            {Object.entries(TICKET_STATUS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar por título ou solicitante..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* ── Ticket table ── */}
      {filteredTickets.length === 0 ? (
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
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-xs text-[var(--color-muted-foreground)]">
                  {ticket.id}
                </TableCell>
                <TableCell className="font-medium">{ticket.title}</TableCell>
                <TableCell>{ticket.requester}</TableCell>
                <TableCell>
                  <Badge variant={ticket.status}>
                    {TICKET_STATUS[ticket.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={ticket.priority}>
                    {TICKET_PRIORITY[ticket.priority]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {filteredTickets.length} de {tickets.length} chamado(s)
      </p>
    </div>
  );
}
