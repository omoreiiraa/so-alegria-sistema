import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { FestaForm, type FestaInitial } from "@/components/admin/festa-form";
import { formatTime } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Editar festa" };

export default async function EditarFestaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: festa }, { data: types }, { data: partners }, { data: vehicles }, { data: pv }] =
    await Promise.all([
      supabase.from("parties").select("*").eq("id", id).single(),
      supabase.from("party_types").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("partners").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("vehicles").select("id, apelido, tipo, placa").order("apelido"),
      supabase.from("party_vehicles").select("vehicle_id").eq("party_id", id),
    ]);

  if (!festa) notFound();

  const initial: FestaInitial = {
    data: festa.data,
    hora_inicio: formatTime(festa.hora_inicio),
    hora_fim: formatTime(festa.hora_fim),
    party_type_id: festa.party_type_id ?? "",
    contratante_nome: festa.contratante_nome ?? "",
    aniversariante_nome: festa.aniversariante_nome ?? "",
    aniversariante_idade: festa.aniversariante_idade?.toString() ?? "",
    qtd_criancas: festa.qtd_criancas?.toString() ?? "",
    is_viagem: festa.is_viagem,
    observacoes: festa.observacoes ?? "",
    partner_id: festa.partner_id ?? "",
    cep: festa.cep ?? "",
    logradouro: festa.logradouro ?? "",
    numero: festa.numero ?? "",
    complemento: festa.complemento ?? "",
    bairro: festa.bairro ?? "",
    cidade: festa.cidade ?? "",
    uf: festa.uf ?? "",
    vehicle_ids: (pv ?? []).map((r) => r.vehicle_id),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Editar festa" />
      <FestaForm
        festaId={id}
        initial={initial}
        partyTypes={types ?? []}
        partners={partners ?? []}
        vehicles={vehicles ?? []}
      />
    </div>
  );
}
