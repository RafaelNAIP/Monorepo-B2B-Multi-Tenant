"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { buildQueryString } from "@/lib/shared/search-params";

const SEARCH_DEBOUNCE_MS = 300;

interface UseTicketFiltersOptions {
  initialStatus?: string;
  initialSearch?: string;
  /** Valor do select que significa "sem filtro" (não entra na URL). */
  allValue: string;
}

/**
 * Filtros de listagem guardados na URL (`?status=&search=`), para que o servidor
 * renderize a página já filtrada e paginada. Mudar um filtro volta para a página 1
 * (o parâmetro `page` não é mantido).
 */
export function useTicketFilters({
  initialStatus,
  initialSearch = "",
  allValue,
}: UseTicketFiltersOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState(initialStatus ?? allValue);
  const [search, setSearch] = useState(initialSearch);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  function navigate(nextStatus: string, nextSearch: string) {
    const query = buildQueryString({
      status: nextStatus === allValue ? undefined : nextStatus,
      search: nextSearch,
    });
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function changeStatus(value: string) {
    // Cancela busca pendente: ela não pode sobrescrever o status recém-escolhido.
    clearTimeout(searchTimer.current);
    setStatus(value);
    navigate(value, search);
  }

  function changeSearch(value: string) {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => navigate(status, value), SEARCH_DEBOUNCE_MS);
  }

  return { status, changeStatus, search, changeSearch };
}
