"use client";

import { useState, useMemo } from "react";

import {
  Badge,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@empresa/ui";

import type { Tenant } from "@/lib/tenants/types";
import { FilterSelect } from "@/components/filter-select";
import {
  SUBSCRIPTION_STATUS,
  type SubscriptionStatus,
} from "@/lib/tenants/constants";

interface TenantTableProps {
  tenants: Tenant[];
}

const ALL_SUBSCRIPTIONS = "all";

export function TenantTable({ tenants }: TenantTableProps) {
  const [searchText, setSearchText] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] =
    useState<string>(ALL_SUBSCRIPTIONS);

  const filteredTenants = useMemo(() => {
    const normalizedSearch = searchText.toLowerCase().trim();

    return tenants.filter((tenant) => {
      // Filtro de texto — busca por nome ou slug
      const matchesText =
        normalizedSearch === "" ||
        tenant.name.toLowerCase().includes(normalizedSearch) ||
        tenant.slug.toLowerCase().includes(normalizedSearch);

      // Filtro de assinatura
      const matchesSubscription =
        subscriptionFilter === ALL_SUBSCRIPTIONS ||
        tenant.subscription === subscriptionFilter;

      return matchesText && matchesSubscription;
    });
  }, [tenants, searchText, subscriptionFilter]);

  return (
    <div className="space-y-4">
      {/* ── Filtros ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar por nome ou subdomínio..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Buscar tenants"
          />
        </div>
        <FilterSelect
          value={subscriptionFilter}
          onChange={setSubscriptionFilter}
          ariaLabel="Filtrar por assinatura"
          allValue={ALL_SUBSCRIPTIONS}
          allLabel="Todas as assinaturas"
          options={Object.entries(SUBSCRIPTION_STATUS)}
        />
      </div>

      {/* ── Tabela ── */}
      {filteredTenants.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] p-8 text-center text-[var(--color-muted-foreground)]">
          {tenants.length === 0
            ? "Nenhum tenant cadastrado."
            : "Nenhum tenant encontrado com os filtros aplicados."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Subdomínio</TableHead>
              <TableHead className="w-36">Assinatura</TableHead>
              <TableHead className="w-40">Data de Criação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell className="font-mono text-sm text-[var(--color-muted-foreground)]">
                  {tenant.slug}
                </TableCell>
                <TableCell>
                  <Badge variant={tenant.subscription as SubscriptionStatus}>
                    {SUBSCRIPTION_STATUS[tenant.subscription]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                  {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {filteredTenants.length === tenants.length
          ? `${tenants.length} tenant(s) cadastrado(s)`
          : `${filteredTenants.length} de ${tenants.length} tenant(s)`}
      </p>
    </div>
  );
}
