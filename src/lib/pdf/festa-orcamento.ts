import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OrcamentoData } from "./orcamento";
import type { DadosEmpresaData } from "./dados-empresa";
import { formatPhoneNational } from "@/lib/utils/phone";

/**
 * Carrega uma festa e monta o que os dois PDFs precisam. Vive num módulo só
 * porque o contrato reaproveita o orçamento quando o cliente ainda não devolveu
 * nada — antes essa montagem estava presa dentro da rota do orçamento.
 *
 * Campo em branco não impede a emissão: cada um cai para "-" no documento.
 */

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
  orcamento_assinado_path: string | null;
  partners: {
    nome: string;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
  } | null;
};

export function montarEndereco(p: {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  partners: PartyRow["partners"];
}): string {
  if (p.partners?.nome) {
    const partes = [
      p.partners.logradouro &&
        `${p.partners.logradouro}${p.partners.numero ? `, ${p.partners.numero}` : ""}`,
      p.partners.bairro,
      p.partners.cidade &&
        `${p.partners.cidade}${p.partners.uf ? `/${p.partners.uf}` : ""}`,
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

export type DadosDaFesta = {
  festa: PartyRow;
  orcamento: OrcamentoData;
  dadosEmpresa: DadosEmpresaData;
  nomeArquivo: string;
};

/** Fatia usada como nome de arquivo: sem acento, sem espaço. */
function slug(valor: string | null): string {
  return (valor ?? "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function carregarDadosDaFesta(
  id: string,
): Promise<DadosDaFesta | null> {
  const supabase = await createClient();

  const [{ data: festaData }, { data: materiaisData }] = await Promise.all([
    supabase
      .from("parties")
      .select(
        `id, data, hora_inicio, hora_fim, contratante_nome, aniversariante_nome,
         aniversariante_idade, qtd_criancas, qtd_recreadores, tema_festa,
         telefone_contato, valor_festa, logradouro, numero, complemento, bairro,
         cidade, uf, orcamento_assinado_path,
         partners ( nome, logradouro, numero, bairro, cidade, uf )`,
      )
      .eq("id", id)
      .single(),
    supabase
      .from("party_stock_items")
      .select("qtd_levada, stock_items ( nome )")
      .eq("party_id", id),
  ]);

  if (!festaData) return null;
  const festa = festaData as unknown as PartyRow;

  const materiais = (
    (materiaisData ?? []) as unknown as {
      qtd_levada: number;
      stock_items: { nome: string } | null;
    }[]
  ).map((m) => ({ nome: m.stock_items?.nome ?? "Item", quantidade: m.qtd_levada }));

  const telefone = festa.telefone_contato
    ? formatPhoneNational(festa.telefone_contato)
    : null;

  return {
    festa,
    orcamento: {
      numero: festa.id.slice(0, 8).toUpperCase(),
      clienteNome: festa.contratante_nome,
      aniversarianteNome: festa.aniversariante_nome,
      aniversarianteIdade: festa.aniversariante_idade,
      telefoneContato: telefone,
      endereco: montarEndereco(festa),
      data: festa.data,
      horaInicio: festa.hora_inicio,
      horaFim: festa.hora_fim,
      qtdCriancas: festa.qtd_criancas,
      temaFesta: festa.tema_festa,
      qtdRecreadores: festa.qtd_recreadores,
      valorFesta: festa.valor_festa,
      materiais,
    },
    dadosEmpresa: {
      clienteNome: festa.contratante_nome,
      telefoneContato: telefone,
      logradouro: festa.logradouro,
      numero: festa.numero,
      bairro: festa.bairro,
      cidade: festa.cidade,
      data: festa.data,
      horaInicio: festa.hora_inicio,
      horaFim: festa.hora_fim,
    },
    nomeArquivo: `${slug(festa.contratante_nome)}-${festa.data}`,
  };
}
