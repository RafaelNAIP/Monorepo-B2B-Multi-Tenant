import { LoginForm } from "./login-form";

interface AuthPageProps {
  params: Promise<{ tenantSlug: string }>;
}

/**
 * Página de login do tenant.
 * Rota pública: /[tenantSlug]/auth
 */
export default async function AuthPage({ params }: AuthPageProps) {
  const { tenantSlug } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-muted)]">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Entrar
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Acesse o painel do tenant <strong>{tenantSlug}</strong>
          </p>
        </div>

        <LoginForm tenantSlug={tenantSlug} />

        <div className="mt-6 rounded border border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-xs text-[var(--color-muted-foreground)]">
          <p className="font-semibold mb-1">Credenciais de teste:</p>
          <p>Admin: admin@demo.com / 12345678</p>
          <p>Cliente: client@demo.com / 12345678</p>
        </div>
      </div>
    </div>
  );
}
