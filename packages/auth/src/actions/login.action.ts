"use server";

import { loginSchema, type LoginInput } from "../schemas/auth.schema";
import { setSessionCookie } from "../lib/session";

// ─── Action State Type ──────────────────────────────────────────────

export interface AuthActionState {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof LoginInput, string[]>>;
  redirectTo?: string;
}

/**
 * Server Action: Login multi-tenant com papel
 *
 * Fluxo:
 * 1. Valida input com Zod (tenantSlug + credenciais)
 * 2. Resolve tenant no banco (placeholder)
 * 3. Verifica credenciais (placeholder)
 * 4. Cria sessão JWT com contexto do tenant e role
 *
 * Uso com useActionState no client:
 * const [state, formAction, isPending] = useActionState(loginAction, initialState)
 */
export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  // 1. Extrair e validar
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    tenantSlug: formData.get("tenantSlug"),
  };

  const validation = loginSchema.safeParse(raw);

  if (!validation.success) {
    return {
      success: false,
      error: "Dados inválidos",
      fieldErrors: validation.error.flatten().fieldErrors as Partial<
        Record<keyof LoginInput, string[]>
      >,
    };
  }

  const { email, password, tenantSlug } = validation.data;
  const role = (formData.get("role") as string) || "client";

  try {
    // 2. Resolve tenant (substituir pela query real ao DB)
    const tenant = await resolveTenant(tenantSlug);
    if (!tenant) {
      return {
        success: false,
        error: "Organização não encontrada",
      };
    }

    // 3. Verifica credenciais (substituir pela lógica real)
    const user = await authenticateUser(email, password, tenant.id, role);
    if (!user) {
      return {
        success: false,
        error: "E-mail ou senha incorretos",
      };
    }

    // 4. Criar sessão com role
    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      role: user.role,
    });

    // 5. Definir redirecionamento baseado no role
    const redirectTo =
      user.role === "admin"
        ? `/${tenantSlug}/admin`
        : `/${tenantSlug}/dashboard`;

    return { success: true, redirectTo };
  } catch (err) {
    console.error("[login] Erro inesperado:", err);
    return {
      success: false,
      error: "Erro interno. Tente novamente.",
    };
  }
}

// ─── Stubs — substituir pela implementação real ─────────────────────

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member" | "viewer";
}

async function resolveTenant(slug: string): Promise<Tenant | null> {
  // TODO: Buscar no banco de dados
  const tenants: Record<string, Tenant> = {
    demo: { id: "t_01", slug: "demo", name: "Demo Corp" },
    acme: { id: "t_02", slug: "acme", name: "Acme Inc" },
    teste: { id: "t_03", slug: "teste", name: "Empresa Teste" },
  };
  return tenants[slug] || null;
}

async function authenticateUser(
  _email: string,
  _password: string,
  _tenantId: string,
  role: string
): Promise<User | null> {
  // TODO: Buscar usuário e verificar hash da senha
  // TODO: Verificar se o usuário tem o role solicitado
  const mappedRole = role === "admin" ? "admin" : role === "client" ? "member" : "viewer";
  return {
    id: "u_01",
    email: _email,
    name: "Usuário Demo",
    role: mappedRole as "admin" | "member" | "viewer",
  };
}
