"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PartyPopper,
  Users,
  Wallet,
  Truck,
  Building2,
  Package,
  Printer,
  FileText,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";
import { eGestao } from "@/types/domain";

/**
 * `nivel: "gestao"` some do menu do funcionário — são as duas telas que ele não
 * alcança. Esconder é conforto, não segurança: quem barra é a RLS, e cada
 * página ainda chama o seu `require*` (ver src/lib/auth.ts).
 */
export const adminNavItems = [
  { href: "/admin", label: "Início", icon: LayoutDashboard, exact: true, nivel: "equipe" },
  { href: "/admin/festas", label: "Festas", icon: PartyPopper, nivel: "equipe" },
  { href: "/admin/ordens-servico", label: "Ordem de Serviço", icon: FileText, nivel: "gestao" },
  { href: "/admin/folha-dia", label: "Folha do Dia", icon: Printer, nivel: "equipe" },
  { href: "/admin/colaboradores", label: "Colaboradores", icon: Users, nivel: "equipe" },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: Wallet, nivel: "gestao" },
  { href: "/admin/veiculos", label: "Veículos", icon: Truck, nivel: "equipe" },
  { href: "/admin/parceiros", label: "Parceiros", icon: Building2, nivel: "equipe" },
  { href: "/admin/estoque", label: "Estoque", icon: Package, nivel: "equipe" },
  { href: "/admin/conta", label: "Minha conta", icon: KeyRound, nivel: "equipe" },
] as const;

export function AdminNav({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const itens = adminNavItems.filter(
    (item) => item.nivel === "equipe" || eGestao(role),
  );

  return (
    <nav className="flex flex-col gap-1">
      {itens.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
