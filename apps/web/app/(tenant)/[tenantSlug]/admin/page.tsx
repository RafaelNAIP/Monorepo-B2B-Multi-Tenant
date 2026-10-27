import type { Metadata } from "next";

import { getAllTenants } from "@/lib/tenants/data";

import { TenantTable } from "./tenant-table";

export const metadata: Metadata = {
  title: "Tenants Cadastrados",
};

export default async function AdminTenantsPage() {
  const tenants = await getAllTenants();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tenants Cadastrados</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Lista de todas as empresas parceiras da plataforma.
        </p>
      </div>

      <TenantTable tenants={tenants} />
    </div>
  );
}
