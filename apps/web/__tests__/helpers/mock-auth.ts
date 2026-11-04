import { vi } from "vitest";

/**
 * Sessão padrão de admin para testes.
 * Corresponde ao primeiro admin do seed (Admin Demo).
 */
export const mockAdminSession = {
  sub: "u_01",
  email: "admin@demo.com",
  name: "Admin Demo",
  tenantId: "t_01",
  tenantSlug: "demo",
  role: "admin" as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

/**
 * Mock de `getSession` — retorna mockAdminSession por padrão.
 * Use `mockGetSession.mockResolvedValue(null)` para simular ausência de sessão.
 */
export const mockGetSession = vi.fn().mockResolvedValue(mockAdminSession);

/**
 * Mock de `requireSession` — retorna `{ ok: true, session }` por padrão.
 * Use `mockRequireSession.mockResolvedValue({ ok: false, errorState: {...} })`
 * para simular acesso negado.
 */
export const mockRequireSession = vi.fn().mockResolvedValue({
  ok: true,
  session: mockAdminSession,
});

/**
 * Reseta ambos os mocks para o estado padrão (admin autenticado).
 * Chame em `beforeEach` junto com `resetPrismaMocks()`.
 */
export function resetAuthMocks() {
  mockGetSession.mockResolvedValue(mockAdminSession);
  mockRequireSession.mockResolvedValue({
    ok: true,
    session: mockAdminSession,
  });
}
