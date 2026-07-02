import type { Metadata } from "next";
import Link from "next/link";
import { PartyPopper, Users, UserPlus, Bell } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Início" };

export default async function AdminHome() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [{ count: festas }, { count: colaboradores }, { count: pendentes }, { count: naoLidas }] =
    await Promise.all([
      supabase.from("parties").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "colaborador"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "colaborador")
        .eq("aprovado", false),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("lida", false),
    ]);

  const stats = [
    { label: "Festas", value: festas ?? 0, icon: PartyPopper, href: "/admin/festas", accent: "text-verde" },
    { label: "Colaboradores", value: colaboradores ?? 0, icon: Users, href: "/admin/colaboradores", accent: "text-laranja" },
    { label: "Aguardando aprovação", value: pendentes ?? 0, icon: UserPlus, href: "/admin/colaboradores", accent: "text-vermelho" },
    { label: "Notificações novas", value: naoLidas ?? 0, icon: Bell, href: "/admin", accent: "text-amarelo" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${profile.nome_completo?.split(" ")[0] ?? "equipe"}`}
        description="Visão geral da operação da Só Alegria."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-1 font-display text-3xl font-extrabold tabular">
                      {s.value}
                    </p>
                  </div>
                  <Icon className={`size-8 ${s.accent}`} />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Use o menu à esquerda para gerir <strong>festas</strong> (kanban e
          calendário), <strong>colaboradores</strong>, <strong>pagamentos</strong>,{" "}
          <strong>veículos</strong>, <strong>parceiros</strong> e{" "}
          <strong>estoque</strong>. As telas serão preenchidas nas próximas fases
          (ver <code>docs/06-roadmap-fases.md</code>).
        </CardContent>
      </Card>
    </div>
  );
}
