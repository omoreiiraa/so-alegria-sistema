import type { Metadata } from "next";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { PerdidosView, type ClientePerdido } from "@/components/admin/perdidos-view";
import { validadeOrcamento } from "@/lib/orcamento-validade";
import { toWhatsAppNumber } from "@/lib/utils/phone";
import { TZ } from "@/lib/utils/date";
import type { MotivoPerda, PartyStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Perdidos" };

type Row = {
  id: string;
  status: PartyStatus;
  data: string;
  created_at: string;
  orcamento_emitido_em: string | null;
  contratante_nome: string | null;
  telefone_contato: string | null;
  aniversariante_nome: string | null;
  valor_festa: number | null;
  motivo_perda: MotivoPerda | null;
  motivo_perda_obs: string | null;
  perdido_em: string | null;
  updated_at: string;
  party_types: { nome: string } | null;
  party_party_types: { party_types: { nome: string } | null }[];
};

const dataLocal = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ts));

export default async function PerdidosPage() {
  await requireEquipe();
  const supabase = await createClient();
  // Perdido = cancelada (marcada com motivo) ou orçamento que venceu sem
  // resposta — este último ainda está em "orcamento" e é filtrado abaixo.
  const { data } = await supabase
    .from("parties")
    .select(
      `id, status, data, created_at, orcamento_emitido_em, contratante_nome, telefone_contato,
       aniversariante_nome, valor_festa, motivo_perda, motivo_perda_obs, perdido_em, updated_at,
       party_types ( nome ), party_party_types ( party_types ( nome ) )`,
    )
    .in("status", ["cancelada", "orcamento"]);

  const rows = (data ?? []) as unknown as Row[];
  const perdidos: ClientePerdido[] = rows.flatMap((r) => {
    let semResposta = false;
    let perdidoEm: string;
    if (r.status === "orcamento") {
      const v = validadeOrcamento(r.orcamento_emitido_em, r.created_at);
      if (!v.vencido) return [];
      semResposta = true;
      perdidoEm = v.validoAte;
    } else {
      // Canceladas antes da 0036 não têm perdido_em: vale a última alteração.
      perdidoEm = dataLocal(r.perdido_em ?? r.updated_at);
    }
    return [
      {
        id: r.id,
        cliente: r.contratante_nome,
        telefone: r.telefone_contato,
        whatsapp: toWhatsAppNumber(r.telefone_contato),
        aniversariante: r.aniversariante_nome,
        dataFesta: r.data,
        tipo:
          r.party_party_types.length > 0
            ? r.party_party_types.map((pt) => pt.party_types?.nome).filter(Boolean).join(" + ")
            : r.party_types?.nome ?? null,
        valor: r.valor_festa,
        // Vencido sem resposta ainda não foi marcado: o motivo é presumido.
        motivo: semResposta ? "sem_resposta" : r.motivo_perda,
        obs: r.motivo_perda_obs,
        pendente: semResposta,
        perdidoEm,
      },
    ];
  });
  perdidos.sort((a, b) => b.perdidoEm.localeCompare(a.perdidoEm));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perdidos"
        description="Clientes que não fecharam, não responderam o orçamento ou desistiram. Tente recuperar: chame no WhatsApp e, se topar, volte para Orçamento."
      />
      <PerdidosView perdidos={perdidos} />
    </div>
  );
}
