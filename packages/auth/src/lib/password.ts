import bcrypt from "bcrypt";

/**
 * Custo do bcrypt (salt rounds).
 * 12 rounds ≈ 250ms por hash — bom equilíbrio entre segurança e performance.
 */
const SALT_ROUNDS = 12;

/**
 * Gera um hash bcrypt para a senha fornecida.
 * O salt é gerado automaticamente (aleatório a cada chamada).
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Compara uma senha em texto puro com um hash bcrypt.
 * Retorna true se a senha corresponde ao hash.
 *
 * Usa comparação em tempo constante internamente (bcrypt.compare).
 */
export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}
