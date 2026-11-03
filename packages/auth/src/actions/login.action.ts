"use server";

import { prisma } from "@empresa/db";
import { loginSchema, type LoginInput } from "../schemas/auth.schema";
import { setSessionCookie } from "../lib/session";
import { verifyPassword } from "../lib/password";

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
    // Campo ausente ou vazio cai no default "client" do schema
    role: formData.get("role") || undefined,
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

  const { email, password, tenantSlug, role } = validation.data;

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
        role,
      },
    });
    if (!user) {
      // Mensagem genérica para prevenir enumeração de usuários
      return {
        success: false,
        error: "E-mail ou senha incorretos",
      };
    }

    // 4. Verificar senha com bcrypt
    //    Guard: usuários legados sem passwordHash são tratados como senha inválida
    if (!user.passwordHash) {
      return {
        success: false,
        error: "E-mail ou senha incorretos",
      };
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      // Mesma mensagem genérica — não revelar se o email existe
      return {
        success: false,
        error: "E-mail ou senha incorretos",
      };
    }

    // 5. Criar sessão
    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      role: user.role,
    });

    // 6. Definir redirecionamento baseado no role
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
