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

export const adminNavItems = [
  { href: "/admin", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/admin/festas", label: "Festas", icon: PartyPopper },
  { href: "/admin/ordens-servico", label: "Ordem de Serviço", icon: FileText },
  { href: "/admin/folha-dia", label: "Folha do Dia", icon: Printer },
  { href: "/admin/colaboradores", label: "Colaboradores", icon: Users },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: Wallet },
  { href: "/admin/veiculos", label: "Veículos", icon: Truck },
  { href: "/admin/parceiros", label: "Parceiros", icon: Building2 },
  { href: "/admin/estoque", label: "Estoque", icon: Package },
  { href: "/admin/conta", label: "Minha conta", icon: KeyRound },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {adminNavItems.map((item) => {
        const active = item.exact
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
