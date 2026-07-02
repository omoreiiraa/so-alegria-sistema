import type { Metadata } from "next";
import { Package } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Estoque" };

export default async function EstoquePage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        description="Materiais, baixa por festa e conferência de devolução."
      />
      <EmptyState
        icon={<Package className="size-6" />}
        title="Controle de estoque em breve"
        description="Cadastre itens com foto, leve para festas (baixa temporária) e confira a devolução com registro de perdas. Ver Fase 4 no roadmap."
      />
    </div>
  );
}
