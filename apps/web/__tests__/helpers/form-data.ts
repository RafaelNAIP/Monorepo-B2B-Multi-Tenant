/**
 * Cria um FormData a partir de um objeto simples.
 * Usado pelos testes de Server Actions.
 */
export function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}
