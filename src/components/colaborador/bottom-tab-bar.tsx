"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarCheck2, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app", label: "Escala", icon: CalendarDays, exact: true },
  { href: "/app/disponibilidade", label: "Disponível", icon: CalendarCheck2 },
  { href: "/app/pagamentos", label: "Pagamentos", icon: Wallet },
  { href: "/app/perfil", label: "Perfil", icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active
                  ? "text-verde-escuro"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "stroke-[2.5]")} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
