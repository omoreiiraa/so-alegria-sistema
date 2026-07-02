import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Parceiros" };

export default async function ParceirosPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Parceiros" description="Buffets parceiros com endereço pronto." />
      <EmptyState
        icon={<Building2 className="size-6" />}
        title="Cadastro de buffets em breve"
        description="Cadastre buffets com endereço (via CEP) para selecionar rapidamente ao criar uma festa. Ver Fase 4 no roadmap."
      />
    </div>
  );
}
