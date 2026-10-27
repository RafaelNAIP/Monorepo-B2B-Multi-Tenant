"use server";

import { prisma } from "@empresa/db";
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
 * 2. Resolve tenant no banco
 * 3. Verifica credenciais (busca usuário por email + tenantId)
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
    // 2. Resolve tenant no banco
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      return {
        success: false,
        error: "Organização não encontrada",
      };
    }

    // 3. Busca usuário por email, tenantId e role
    const user = await prisma.user.findFirst({
      where: {
        email,
        tenantId: tenant.id,
        role: role as "admin" | "client",
      },
    });
    if (!user) {
      return {
        success: false,
        error: "E-mail ou senha incorretos",
      };
    }

    // Nota: Verificação de senha está desabilitada (sem hash implementado).
    // Em produção, comparar password com hash armazenado (bcrypt).
    // Por ora, qualquer senha é aceita se o usuário existe.

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
