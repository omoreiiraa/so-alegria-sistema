import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Pagamentos" };

export default async function AdminPagamentosPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamentos"
        description="Fechamento semanal (seg–dom) e marcação de pagos."
      />
      <EmptyState
        icon={<Wallet className="size-6" />}
        title="Fechamento de pagamentos em breve"
        description="Selecione a semana, veja o total por colaborador (com PIX), marque como pago e exporte CSV. Ver Fase 3 no roadmap."
      />
    </div>
  );
}
