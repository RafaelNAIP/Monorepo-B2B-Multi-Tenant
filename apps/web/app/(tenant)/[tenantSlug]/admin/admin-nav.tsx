"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@empresa/ui";

interface NavLink {
  href: string;
  label: string;
  exact?: boolean;
}

interface AdminNavProps {
  tenantSlug: string;
}

export function AdminNav({ tenantSlug }: AdminNavProps) {
  const pathname = usePathname();

  const links: NavLink[] = [
    {
      href: `/${tenantSlug}/admin`,
      label: "Tenants",
      exact: true,
    },
    {
      href: `/${tenantSlug}/admin/chamados`,
      label: "Chamados",
    },
    {
      href: `/${tenantSlug}/admin/tema`,
      label: "Configuração de Marca",
    },
  ];

  function isActive(link: NavLink): boolean {
    if (link.exact) {
      return pathname === link.href;
    }
    return pathname.startsWith(link.href);
  }

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active = isActive(link);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--color-primary,#2563eb)] text-white"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
