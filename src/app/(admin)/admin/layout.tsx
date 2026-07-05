import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { NotificationBell, type Notificacao } from "@/components/admin/notification-bell";
import { BrandBadge, Wordmark } from "@/components/brand/wordmark";
import { LogoutButton } from "@/components/common/logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const [{ data: notifs }, { count: unread }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, tipo, titulo, corpo, party_id, lida, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("lida", false),
  ]);

  return (
    <div className="theme-admin flex min-h-dvh bg-background text-foreground">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <BrandBadge className="size-9" />
          <Wordmark className="text-base text-sidebar-foreground" subtitle={false} />
        </div>
        <div className="flex-1 px-3">
          <AdminNav />
        </div>
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="mb-2 truncate text-xs text-sidebar-foreground/60">
            {profile.nome_completo}
          </div>
          <LogoutButton label="Sair" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <AdminMobileNav />
            <Wordmark className="text-base" subtitle={false} />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <NotificationBell
              notifications={(notifs ?? []) as Notificacao[]}
              unread={unread ?? 0}
            />
            <div className="lg:hidden">
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
