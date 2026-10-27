import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@empresa/auth";
import { getTenantById } from "@/lib/tenants/data";

import { ThemeEditorForm } from "./theme-editor-form";

export const metadata: Metadata = {
  title: "Configuração de Marca",
};

interface ThemePageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ThemeEditorPage({ params }: ThemePageProps) {
  const { tenantSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${tenantSlug}/auth`);
  }

  const tenant = await getTenantById(session.tenantId);

  if (!tenant) {
    redirect(`/${tenantSlug}/admin`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuração de Marca</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Personalize a identidade visual do portal da sua empresa.
        </p>
      </div>

      <ThemeEditorForm
        tenantId={tenant.id}
        currentName={tenant.name}
        currentTheme={tenant.theme}
      />
    </div>
  );
}
