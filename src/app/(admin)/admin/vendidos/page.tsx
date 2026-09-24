import type { Metadata } from "next";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { VendidosView, type ClienteVendido } from "@/components/admin/vendidos-view";
import { chaveCliente, proximaRepeticao, diasEntre } from "@/lib/clientes";
import { todayISO } from "@/lib/utils/date";
import { toWhatsAppNumber } from "@/lib/utils/phone";
import type { PartyStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Vendidos" };

type Row = {
  id: string;
  status: PartyStatus;
  data: string;
  contratante_nome: string | null;
  telefone_contato: string | null;
  aniversariante_nome: string | null;
  aniversariante_idade: number | null;
  valor_festa: number | null;
  party_types: { nome: string } | null;
  party_party_types: { party_types: { nome: string } | null }[];
};

export default async function VendidosPage() {
  await requireEquipe();
  const supabase = await createClient();
  // Vendido = festa que aconteceu: realizada ou já paga.
  const { data } = await supabase
    .from("parties")
    .select(
      `id, status, data, contratante_nome, telefone_contato, aniversariante_nome,
       aniversariante_idade, valor_festa, party_types ( nome ),
       party_party_types ( party_types ( nome ) )`,
    )
    .in("status", ["realizada", "paga"])
    .order("data", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const hoje = todayISO();

  // Agrupa por cliente; como as linhas vêm da mais recente para a mais
  // antiga, a primeira festa de cada grupo é a última que ele fez.
  const grupos = new Map<string, Row[]>();
  for (const r of rows) {
    const chave = chaveCliente({ id: r.id, contratante: r.contratante_nome, telefone: r.telefone_contato });
    grupos.set(chave, [...(grupos.get(chave) ?? []), r]);
  }

  const clientes: ClienteVendido[] = [...grupos.entries()].map(([chave, festas]) => {
    const ultima = festas[0];
    const proxima = proximaRepeticao(ultima.data, hoje);
    const anos = Number(proxima.slice(0, 4)) - Number(ultima.data.slice(0, 4));
    return {
      chave,
      cliente: ultima.contratante_nome ?? festas.find((f) => f.contratante_nome)?.contratante_nome ?? null,
      telefone: ultima.telefone_contato,
      whatsapp: toWhatsAppNumber(ultima.telefone_contato),
      festas: festas.map((f) => ({
        id: f.id,
        data: f.data,
        tipo:
          f.party_party_types.length > 0
            ? f.party_party_types.map((pt) => pt.party_types?.nome).filter(Boolean).join(" + ")
            : f.party_types?.nome ?? null,
        aniversariante: f.aniversariante_nome,
        idade: f.aniversariante_idade,
        valor: f.valor_festa,
      })),
      proximaData: proxima,
      diasAteProxima: diasEntre(hoje, proxima),
      // Idade que o aniversariante faz na próxima data, quando dá para saber.
      proximaIdade: ultima.aniversariante_idade != null ? ultima.aniversariante_idade + anos : null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendidos"
        description="Clientes que já fizeram festa com a gente. Ordenados pela data em que a festa se repete, para chamar na hora certa."
      />
      <VendidosView clientes={clientes} />
    </div>
  );
}
