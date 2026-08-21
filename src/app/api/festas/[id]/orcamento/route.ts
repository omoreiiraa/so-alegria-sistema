import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarOrcamentoPDF, type OrcamentoData } from "@/lib/pdf/orcamento";
import { formatPhoneNational } from "@/lib/utils/phone";

type PartyRow = {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  contratante_nome: string | null;
  aniversariante_nome: string | null;
  aniversariante_idade: number | null;
  qtd_criancas: number | null;
  qtd_recreadores: number | null;
  tema_festa: string | null;
  telefone_contato: string | null;
  valor_festa: number | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  partners: {
    nome: string;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
  } | null;
};

function montarEndereco(p: PartyRow): string {
  if (p.partners?.nome) {
    const partes = [
      p.partners.logradouro &&
        `${p.partners.logradouro}${p.partners.numero ? `, ${p.partners.numero}` : ""}`,
      p.partners.bairro,
      p.partners.cidade && `${p.partners.cidade}${p.partners.uf ? `/${p.partners.uf}` : ""}`,
    ].filter(Boolean);
    return partes.length > 0
      ? `${p.partners.nome} - ${partes.join(", ")}`
      : p.partners.nome;
  }
  const partes = [
    p.logradouro && `${p.logradouro}${p.numero ? `, ${p.numero}` : ""}`,
    p.complemento,
    p.bairro,
    p.cidade && `${p.cidade}${p.uf ? `/${p.uf}` : ""}`,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : "Local a definir";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: festaData }, { data: materiaisData }] = await Promise.all([
    supabase
      .from("parties")
      .select(
        `id, data, hora_inicio, hora_fim, contratante_nome, aniversariante_nome,
         aniversariante_idade, qtd_criancas, qtd_recreadores, tema_festa,
         telefone_contato, valor_festa, logradouro, numero, complemento, bairro,
         cidade, uf, partners ( nome, logradouro, numero, bairro, cidade, uf )`,
      )
      .eq("id", id)
      .single(),
    supabase
      .from("party_stock_items")
      .select("qtd_levada, stock_items ( nome )")
      .eq("party_id", id),
  ]);

  if (!festaData) {
    return NextResponse.json({ error: "Festa não encontrada" }, { status: 404 });
  }

  const festa = festaData as unknown as PartyRow;

  const materiais = (
    (materiaisData ?? []) as unknown as {
      qtd_levada: number;
      stock_items: { nome: string } | null;
    }[]
  ).map((m) => ({
    nome: m.stock_items?.nome ?? "Item",
    quantidade: m.qtd_levada,
  }));

  const dados: OrcamentoData = {
    numero: festa.id.slice(0, 8).toUpperCase(),
    clienteNome: festa.contratante_nome,
    aniversarianteNome: festa.aniversariante_nome,
    aniversarianteIdade: festa.aniversariante_idade,
    telefoneContato: festa.telefone_contato
      ? formatPhoneNational(festa.telefone_contato)
      : null,
    endereco: montarEndereco(festa),
    data: festa.data,
    horaInicio: festa.hora_inicio,
    horaFim: festa.hora_fim,
    qtdCriancas: festa.qtd_criancas,
    temaFesta: festa.tema_festa,
    qtdRecreadores: festa.qtd_recreadores,
    valorFesta: festa.valor_festa,
    materiais,
  };

  const pdf = await gerarOrcamentoPDF(dados);

  const nomeCliente = (festa.contratante_nome ?? "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orcamento-${nomeCliente}-${festa.data}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
