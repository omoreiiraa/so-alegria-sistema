import type { Metadata } from "next";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { FestaForm } from "@/components/admin/festa-form";

export const metadata: Metadata = { title: "Nova festa" };

export default async function NovaFestaPage() {
  await requireEquipe();
  const supabase = await createClient();
  const [{ data: types }, { data: partners }, { data: vehicles }] = await Promise.all([
    supabase.from("party_types").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("partners").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("vehicles").select("id, apelido, tipo, placa").order("apelido"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Nova festa" description="Preencha os dados e depois escale a equipe." />
      <FestaForm
        partyTypes={types ?? []}
        partners={partners ?? []}
        vehicles={vehicles ?? []}
      />
    </div>
  );
}
