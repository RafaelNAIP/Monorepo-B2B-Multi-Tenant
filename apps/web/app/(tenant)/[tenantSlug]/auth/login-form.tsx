"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button, Input, Label } from "@empresa/ui";
import { loginAction, type AuthActionState } from "@empresa/auth/actions";

import { USER_ROLES } from "@/lib/users/constants";
import type { UserRole } from "@/lib/users/constants";

const initialState: AuthActionState = {
  success: false,
};

interface LoginFormProps {
  tenantSlug: string;
}

export function LoginForm({ tenantSlug }: LoginFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  // Redireciona após login bem-sucedido
  useEffect(() => {
    if (state.success) {
      const redirectTo = state.redirectTo || `/${tenantSlug}/dashboard`;
      router.push(redirectTo);
    }
  }, [state.success, state.redirectTo, tenantSlug, router]);

  return (
    <form action={formAction} className="space-y-4">
      {/* Slug do tenant como hidden field */}
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      {/* Erro global */}
      {state.error && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 p-3 text-sm text-[var(--color-destructive)]"
        >
          {state.error}
        </div>
      )}

      {/* Tipo de usuário */}
      <div className="space-y-2">
        <Label htmlFor="role">Tipo de acesso</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(USER_ROLES) as [UserRole, string][]).map(
            ([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] p-3 transition-colors has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary)]/5"
              >
                <input
                  type="radio"
                  name="role"
                  value={value}
                  defaultChecked={value === "client"}
                  className="accent-[var(--color-primary)]"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* E-mail */}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          required
          error={!!state.fieldErrors?.email}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
        {state.fieldErrors?.email && (
          <p id="email-error" className="text-xs text-[var(--color-destructive)]">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      {/* Senha */}
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          minLength={8}
          error={!!state.fieldErrors?.password}
          aria-describedby={
            state.fieldErrors?.password ? "password-error" : undefined
          }
        />
        {state.fieldErrors?.password && (
          <p
            id="password-error"
            className="text-xs text-[var(--color-destructive)]"
          >
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={isPending}
      >
        {isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
