/** Quantidade fixa de itens por página nas listagens paginadas no servidor. */
export const PAGE_SIZE = 10;

export interface PaginatedResult<T> {
  items: T[];
  /** Total de itens que atendem aos filtros (não só da página atual). */
  total: number;
  /** Página efetivamente retornada (pode diferir da pedida se ela não existir). */
  page: number;
  totalPages: number;
}

/**
 * Lê o parâmetro `page` da URL. Entradas inválidas (ausentes, zero, negativas,
 * fracionárias, texto) viram a página 1. Parâmetro repetido usa o primeiro valor.
 */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || !/^\d+$/.test(value)) return 1;

  const page = Number(value);
  return page >= 1 ? page : 1;
}

/** Número de páginas para um total. Sempre pelo menos 1 (lista vazia ainda tem uma página). */
export function totalPagesFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Limita a página ao intervalo [1, totalPages]. */
export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), totalPages);
}

/** Traduz a página em skip/take para o Prisma. */
export function pageWindow(page: number, pageSize: number): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
