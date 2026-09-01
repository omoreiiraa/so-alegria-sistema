import type { Metadata } from "next";
import { requireGestao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import {
  OrdensServicoView,
  type OrdemServicoCard,
  type EscalaSemOS,
} from "@/components/admin/ordens-servico-view";
import type { ServiceOrderStatus, ConfirmationMethod } from "@/types/domain";

export const metadata: Metadata = { title: "Ordem de Serviço" };

type OSRow = {
  id: string;
  ano: number;
  numero: number;
  data_emissao: string;
  status: ServiceOrderStatus;
  enviada_em: string | null;
  respondido_em: string | null;
  meio_confirmacao: ConfirmationMethod | null;
  motivo_recusa: string | null;
  arquivo_path: string | null;
  party_assignment_id: string;
  party_assignments: {
    profiles: { nome_completo: string | null; nome_tio: string | null } | null;
    parties: {
      id: string;
      data: string;
      hora_inicio: string;
      hora_fim: string;
      contratante_nome: string | null;
      cidade: string | null;
      uf: string | null;
      partners: { nome: string } | null;
    } | null;
  } | null;
};

type AssignmentRow = {
  id: string;
  status: string;
  profiles: { nome_completo: string | null; nome_tio: string | null } | null;
  parties: {
    id: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    contratante_nome: string | null;
    cidade: string | null;
    uf: string | null;
    partners: { nome: string } | null;
  } | null;
};

function local(p: {
  cidade: string | null;
  uf: string | null;
  partners: { nome: string } | null;
}): string {
  if (p.partners?.nome) return p.partners.nome;
  return p.cidade ? `${p.cidade}${p.uf ? `/${p.uf}` : ""}` : "";
}

export default async function OrdensServicoPage() {
  await requireGestao();
  const supabase = await createClient();

  const [{ data: osData }, { data: assignData }] = await Promise.all([
    supabase
      .from("service_orders")
      .select(
        `id, ano, numero, data_emissao, status, enviada_em, respondido_em,
         meio_confirmacao, motivo_recusa, arquivo_path, party_assignment_id,
         party_assignments (
           profiles ( nome_completo, nome_tio ),
           parties ( id, data, hora_inicio, hora_fim, contratante_nome, cidade, uf,
                     partners ( nome ) )
         )`,
      )
      .order("ano", { ascending: false })
      .order("numero", { ascending: false }),
    supabase
      .from("party_assignments")
      .select(
        `id, status,
         profiles ( nome_completo, nome_tio ),
         parties ( id, data, hora_inicio, hora_fim, contratante_nome, cidade, uf,
                   partners ( nome ) )`,
      )
      .in("status", ["pendente", "confirmada"]),
  ]);

  const ordens = (osData ?? []) as unknown as OSRow[];
  const comOS = new Set(ordens.map((o) => o.party_assignment_id));

  const cards: OrdemServicoCard[] = ordens.map((o) => {
    const festa = o.party_assignments?.parties;
    return {
      id: o.id,
      numero: o.numero,
      ano: o.ano,
      dataEmissao: o.data_emissao,
      status: o.status,
      enviadaEm: o.enviada_em,
      respondidoEm: o.respondido_em,
      meioConfirmacao: o.meio_confirmacao,
      motivoRecusa: o.motivo_recusa,
      temArquivo: !!o.arquivo_path,
      colaborador:
        o.party_assignments?.profiles?.nome_completo ??
        o.party_assignments?.profiles?.nome_tio ??
        "Colaborador",
      festaId: festa?.id ?? null,
      festaData: festa?.data ?? null,
      festaHoraInicio: festa?.hora_inicio ?? null,
      festaHoraFim: festa?.hora_fim ?? null,
      contratante: festa?.contratante_nome ?? null,
      local: festa ? local(festa) : "",
    };
  });

  const semOS: EscalaSemOS[] = ((assignData ?? []) as unknown as AssignmentRow[])
    .filter((a) => !comOS.has(a.id) && a.parties)
    .map((a) => ({
      assignmentId: a.id,
      colaborador:
        a.profiles?.nome_completo ?? a.profiles?.nome_tio ?? "Colaborador",
      festaId: a.parties!.id,
      festaData: a.parties!.data,
      contratante: a.parties!.contratante_nome,
      local: local(a.parties!),
    }))
    .sort((a, b) => a.festaData.localeCompare(b.festaData));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordem de Serviço"
        description="Uma OS por colaborador escalado. Gere, baixe o documento, preencha o restante e registre a resposta."
      />
      <OrdensServicoView ordens={cards} semOS={semOS} />
    </div>
  );
}
