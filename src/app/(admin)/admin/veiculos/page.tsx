import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Veículos" };

export default async function VeiculosPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Veículos" description="Frota, rodízio e vínculo com festas." />
      <EmptyState
        icon={<Truck className="size-6" />}
        title="Gestão de frota em breve"
        description="Cadastre carros e vans, marque dia de rodízio e vincule às festas com alerta automático. Ver Fase 4 no roadmap."
      />
    </div>
  );
}
