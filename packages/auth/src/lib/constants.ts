// ─── Session constants (edge-safe — sem dependências Node) ─────

/** Nome do cookie de sessão */
export const SESSION_COOKIE_NAME = "empresa-session";

/** Tempo de vida da sessão em segundos (30 dias) */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 2_592_000s
