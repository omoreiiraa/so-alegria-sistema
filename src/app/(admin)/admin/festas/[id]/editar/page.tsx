import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { FestaForm, type FestaInitial } from "@/components/admin/festa-form";
import { formatTime } from "@/lib/utils/date";
import { formatBRLInput } from "@/lib/utils/money";
import { formatPhoneNational } from "@/lib/utils/phone";

export const metadata: Metadata = { title: "Editar festa" };

export default async function EditarFestaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEquipe();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: festa }, { data: types }, { data: partners }, { data: vehicles }, { data: pv }, { data: pt }] =
    await Promise.all([
      supabase.from("parties").select("*").eq("id", id).single(),
      supabase.from("party_types").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("partners").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("vehicles").select("id, apelido, tipo, placa").order("apelido"),
      supabase.from("party_vehicles").select("vehicle_id").eq("party_id", id),
      supabase.from("party_party_types").select("party_type_id").eq("party_id", id),
    ]);

  if (!festa) notFound();

  const initial: FestaInitial = {
    fechada_por: festa.fechada_por ?? "",
    data: festa.data,
    hora_inicio: formatTime(festa.hora_inicio),
    hora_fim: formatTime(festa.hora_fim),
    party_type_ids: pt && pt.length > 0
      ? pt.map((r) => r.party_type_id)
      : festa.party_type_id
      ? [festa.party_type_id]
      : [],
    contratante_nome: festa.contratante_nome ?? "",
    aniversariante_nome: festa.aniversariante_nome ?? "",
    aniversariante_idade: festa.aniversariante_idade?.toString() ?? "",
    qtd_criancas: festa.qtd_criancas?.toString() ?? "",
    is_viagem: festa.is_viagem,
    observacoes: festa.observacoes ?? "",
    valor_festa: festa.valor_festa != null ? formatBRLInput(String(Math.round(festa.valor_festa * 100))) : "",
    observacoes_orcamento: festa.observacoes_orcamento ?? "",
    telefone_contato: formatPhoneNational(festa.telefone_contato),
    tema_festa: festa.tema_festa ?? "",
    qtd_recreadores: festa.qtd_recreadores?.toString() ?? "",
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
