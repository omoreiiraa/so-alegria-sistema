import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { NotificationBell, type Notificacao } from "@/components/admin/notification-bell";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/common/logout-button";
import { ROLE_LABEL } from "@/types/domain";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O layout é o piso comum do escritório: quem entra aqui tem login. Pagamentos
  // e Ordem de Serviço exigem gestão, cada um no seu `require*` (src/lib/auth.ts).
  const { profile } = await requireEquipe();

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
        <div className="flex justify-center px-5 py-6">
          <Logo className="size-[72px]" />
        </div>
        <div className="flex-1 px-3">
          <AdminNav role={profile.role} />
        </div>
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="mb-2 truncate text-xs text-sidebar-foreground/60">
            {profile.nome_completo}
            <span className="block text-sidebar-foreground/40">
              {ROLE_LABEL[profile.role]}
            </span>
          </div>
          <LogoutButton label="Sair" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <AdminMobileNav role={profile.role} />
            <Logo className="size-9" />
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

        {/* Ocupa toda a largura disponível: o respiro vem do padding, que
            cresce com a tela, e não de um limite fixo de largura. */}
        <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
