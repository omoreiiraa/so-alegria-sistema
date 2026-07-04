import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { VeiculosManager, type Veiculo } from "@/components/admin/veiculos-manager";

export const metadata: Metadata = { title: "Veículos" };

export default async function VeiculosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("id, tipo, apelido, placa, dia_rodizio, status")
    .order("apelido");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veículos"
        description="Frota da empresa. Vans são rotativas; carros são dirigidos por um recreador (+R$20)."
      />
      <VeiculosManager veiculos={(data ?? []) as Veiculo[]} />
    </div>
  );
}
