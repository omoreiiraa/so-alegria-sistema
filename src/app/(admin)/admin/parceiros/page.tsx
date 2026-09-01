import type { Metadata } from "next";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { ParceirosManager, type Parceiro } from "@/components/admin/parceiros-manager";

export const metadata: Metadata = { title: "Parceiros" };

export default async function ParceirosPage() {
  await requireEquipe();
  const supabase = await createClient();
  const { data } = await supabase
    .from("partners")
    .select("id, nome, cep, logradouro, numero, complemento, bairro, cidade, uf, contato, observacoes")
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parceiros"
        description="Buffets parceiros. O endereço é preenchido automaticamente ao criar a festa."
      />
      <ParceirosManager parceiros={(data ?? []) as Parceiro[]} />
    </div>
  );
}
