import Link from "next/link";

import { buildQueryString } from "@/lib/shared/search-params";

interface PaginationControlsProps {
  /** Caminho da listagem, ex.: "/demo/dashboard" */
  pathname: string;
  /** Filtros atuais, preservados nos links de navegação */
  query: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  total: number;
}

const linkClass =
  "inline-flex h-8 items-center rounded-md border border-[var(--color-border)] px-3 text-xs font-medium transition-colors hover:bg-[var(--color-muted)]";
const disabledClass =
  "inline-flex h-8 items-center rounded-md border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-muted-foreground)] opacity-50";

/**
 * Navegação entre páginas de uma listagem paginada no servidor.
 * Usa links (funciona em Server Components); a página 1 não leva `page` na URL.
 */
export function PaginationControls({
  pathname,
  query,
  page,
  totalPages,
  total,
}: PaginationControlsProps) {
  const hrefFor = (target: number) => {
    const queryString = buildQueryString({
      ...query,
      page: target > 1 ? String(target) : undefined,
    });
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[var(--color-muted-foreground)]">{`${total} chamado(s)`}</p>

      {totalPages > 1 && (
        <nav aria-label="Paginação" className="flex items-center gap-3">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className={linkClass}>
              Anterior
            </Link>
          ) : (
            <span aria-disabled="true" className={disabledClass}>
              Anterior
            </span>
          )}

          <span className="text-xs text-[var(--color-muted-foreground)]">
            {`Página ${page} de ${totalPages}`}
          </span>

          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} rel="next" className={linkClass}>
              Próxima
            </Link>
          ) : (
            <span aria-disabled="true" className={disabledClass}>
              Próxima
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
