import { parsePage } from "@/lib/shared/pagination";

import { ticketFilterSchema } from "./schemas";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Lê página, status e busca da URL de uma listagem de chamados.
 * Parâmetros inválidos viram "sem filtro" / página 1; nunca lançam erro.
 */
export function parseTicketListParams(raw: RawSearchParams) {
  const filters = ticketFilterSchema.parse({
    status: first(raw.status),
    search: first(raw.search),
  });

  return {
    page: parsePage(raw.page),
    status: filters.status,
    search: filters.search,
  };
}
