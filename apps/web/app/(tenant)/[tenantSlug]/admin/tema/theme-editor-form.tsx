"use client";

import { useActionState, useState } from "react";

import { Button, Input, Label } from "@empresa/ui";

import type { TenantTheme } from "@/lib/tenants/types";
import {
  updateThemeAction,
  type ThemeActionState,
} from "@/lib/tenants/actions";

const initialState: ThemeActionState = {
  success: false,
  error: null,
  fieldErrors: {},
};

interface ThemeEditorFormProps {
  tenantId: string;
  currentName: string;
  currentTheme: TenantTheme;
}

export function ThemeEditorForm({
  tenantId,
  currentName,
  currentTheme,
}: ThemeEditorFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateThemeAction,
    initialState
  );

  // Estado local para preview em tempo real
  const [previewColor, setPreviewColor] = useState(currentTheme.primaryColor);
  const [previewRadius, setPreviewRadius] = useState(currentTheme.borderRadius);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* ── Formulário ── */}
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="tenantId" value={tenantId} />

        {/* Mensagem de sucesso */}
        {state.success && (
          <div
            role="status"
            className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
          >
            Tema salvo com sucesso!
          </div>
        )}

        {/* Erro global */}
        {state.error && (
          <div
            role="alert"
            className="rounded border border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/5 p-3 text-sm text-[var(--color-destructive)]"
          >
            {state.error}
          </div>
        )}

        {/* Nome da empresa */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Nome da Empresa</Label>
          <Input
            id="companyName"
            name="companyName"
            type="text"
            defaultValue={currentName}
            placeholder="Nome da empresa"
            required
            error={!!state.fieldErrors?.companyName}
            aria-describedby={
              state.fieldErrors?.companyName ? "companyName-error" : undefined
            }
          />
          {state.fieldErrors?.companyName && (
            <p
              id="companyName-error"
              className="text-xs text-[var(--color-destructive)]"
            >
              {state.fieldErrors.companyName[0]}
            </p>
          )}
        </div>

        {/* Cor primária */}
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Cor Primária</Label>
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              name="primaryColor"
              type="color"
              defaultValue={currentTheme.primaryColor}
              onChange={(e) => setPreviewColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-1"
              aria-describedby={
                state.fieldErrors?.primaryColor
                  ? "primaryColor-error"
                  : undefined
              }
            />
            <Input
              type="text"
              value={previewColor}
              onChange={(e) => setPreviewColor(e.target.value)}
              className="w-32 font-mono text-sm"
              readOnly
              tabIndex={-1}
            />
          </div>
          {state.fieldErrors?.primaryColor && (
            <p
              id="primaryColor-error"
              className="text-xs text-[var(--color-destructive)]"
            >
              {state.fieldErrors.primaryColor[0]}
            </p>
          )}
        </div>

        {/* Curvatura das bordas */}
        <div className="space-y-2">
          <Label htmlFor="borderRadius">
            Curvatura das Bordas:{" "}
            <span className="font-mono text-[var(--color-muted-foreground)]">
              {previewRadius}px
            </span>
          </Label>
          <input
            id="borderRadius"
            name="borderRadius"
            type="range"
            min="0"
            max="24"
            step="1"
            defaultValue={currentTheme.borderRadius}
            onChange={(e) => setPreviewRadius(Number(e.target.value))}
            className="w-full accent-[var(--color-primary)]"
            aria-describedby={
              state.fieldErrors?.borderRadius
                ? "borderRadius-error"
                : undefined
            }
          />
          <div className="flex justify-between text-xs text-[var(--color-muted-foreground)]">
            <span>0px</span>
            <span>24px</span>
          </div>
          {state.fieldErrors?.borderRadius && (
            <p
              id="borderRadius-error"
              className="text-xs text-[var(--color-destructive)]"
            >
              {state.fieldErrors.borderRadius[0]}
            </p>
          )}
        </div>

        {/* URL do logo */}
        <div className="space-y-2">
          <Label htmlFor="logoUrl">URL do Logo</Label>
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            defaultValue={currentTheme.logoUrl}
            placeholder="https://exemplo.com/logo.png"
            required
            error={!!state.fieldErrors?.logoUrl}
            aria-describedby={
              state.fieldErrors?.logoUrl ? "logoUrl-error" : undefined
            }
          />
          {state.fieldErrors?.logoUrl && (
            <p
              id="logoUrl-error"
              className="text-xs text-[var(--color-destructive)]"
            >
              {state.fieldErrors.logoUrl[0]}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </form>

      {/* ── Preview em tempo real ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pré-visualização</h2>
        <div
          className="rounded-lg border border-[var(--color-border)] p-6"
          style={
            {
              "--preview-primary": previewColor,
              "--preview-radius": `${previewRadius}px`,
            } as React.CSSProperties
          }
        >
          <div className="space-y-4">
            {/* Simulação de botão com tema */}
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{
                backgroundColor: previewColor,
                borderRadius: `${previewRadius}px`,
              }}
            >
              Botão Exemplo
            </button>

            {/* Simulação de card */}
            <div
              className="border border-[var(--color-border)] p-4"
              style={{ borderRadius: `${previewRadius}px` }}
            >
              <p className="text-sm font-medium">Card de exemplo</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Visualize como ficará a interface do portal.
              </p>
            </div>

            {/* Simulação de input */}
            <div
              className="border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]"
              style={{ borderRadius: `${previewRadius}px` }}
            >
              Input de exemplo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
