/**
 * Monta a query string de uma URL de listagem. Valores undefined, vazios ou
 * só com espaços são omitidos, para que a URL fique limpa (ex.: sem `status=`).
 */
export function buildQueryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (trimmed) search.set(key, trimmed);
  }

  return search.toString();
}
