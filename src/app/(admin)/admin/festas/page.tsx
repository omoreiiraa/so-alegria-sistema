import type { Metadata } from "next";
import { PartyPopper } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Festas" };

export default async function FestasPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Festas" description="Kanban e calendário das festas." />
      <EmptyState
        icon={<PartyPopper className="size-6" />}
        title="Kanban de festas em breve"
        description="Aqui você vai criar festas, arrastar entre status (Fechada → Escalada → Confirmada → Realizada) e escalar a equipe. Ver Fase 2 no roadmap."
      />
    </div>
  );
}
