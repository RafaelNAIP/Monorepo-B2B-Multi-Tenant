import { notFound } from "next/navigation";

import { tenantSlugSchema } from "@empresa/auth/schemas";

import { getTenantBySlug } from "@/lib/tenants/data";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

/**
 * Layout do tenant — valida o slug e injeta CSS custom properties do tema.
 * O slug validado fica disponível via params em qualquer page filha.
 */
export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { tenantSlug } = await params;

  // Valida o formato do slug
  const parsed = tenantSlugSchema.safeParse(tenantSlug);
  if (!parsed.success) {
    notFound();
  }

  // Busca o tenant para aplicar o tema
  const tenant = await getTenantBySlug(parsed.data);

  // CSS custom properties do tema do tenant
  const themeStyles = tenant
    ? ({
        "--tenant-primary": tenant.theme.primaryColor,
        "--tenant-radius": `${tenant.theme.borderRadius}px`,
        "--tenant-logo": `url(${tenant.theme.logoUrl})`,
        "--color-primary": tenant.theme.primaryColor,
      } as React.CSSProperties)
    : {};

  return (
    <div
      data-tenant={parsed.data}
      className="flex min-h-screen flex-col"
      style={themeStyles}
    >
      {children}
    </div>
  );
}
