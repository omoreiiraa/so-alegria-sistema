import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarOrdemServicoDocx, nomeArquivoOS } from "@/lib/docx/ordem-servico";

type OSRow = {
  id: string;
  ano: number;
  numero: number;
  data_emissao: string;
  party_assignments: {
    horario_apresentacao: string | null;
    profiles: { nome_completo: string | null; nome_tio: string | null } | null;
    parties: {
      data: string;
      hora_inicio: string;
      hora_fim: string;
      contratante_nome: string | null;
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
    } | null;
  } | null;
};

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

  const { data } = await supabase
    .from("service_orders")
    .select(
      `id, ano, numero, data_emissao,
       party_assignments (
         horario_apresentacao,
         profiles ( nome_completo, nome_tio ),
         parties (
           data, hora_inicio, hora_fim, contratante_nome,
           logradouro, numero, complemento, bairro, cidade, uf,
           partners ( nome, logradouro, numero, bairro, cidade, uf )
         )
       )`,
    )
    .eq("id", id)
    .single();

  if (!data) {
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  }

  const os = data as unknown as OSRow;
  const assignment = os.party_assignments;
  const festa = assignment?.parties;

  if (!festa) {
    return NextResponse.json(
      { error: "Festa vinculada à OS não encontrada" },
      { status: 404 },
    );
  }

  const enderecoLivre = [
    festa.logradouro && `${festa.logradouro}${festa.numero ? `, ${festa.numero}` : ""}`,
    festa.complemento,
    festa.bairro,
    festa.cidade && `${festa.cidade}${festa.uf ? `/${festa.uf}` : ""}`,
  ]
    .filter(Boolean)
    .join(", ");

  const enderecoParceiro = festa.partners
    ? [
        festa.partners.logradouro &&
          `${festa.partners.logradouro}${festa.partners.numero ? `, ${festa.partners.numero}` : ""}`,
        festa.partners.bairro,
        festa.partners.cidade &&
          `${festa.partners.cidade}${festa.partners.uf ? `/${festa.partners.uf}` : ""}`,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const bytes = gerarOrdemServicoDocx({
    numero: os.numero,
    ano: os.ano,
    dataEmissao: os.data_emissao,
    dataEvento: festa.data,
    // O horário de chegada é o de apresentação do colaborador; sem ele, vale o
    // início da festa.
    horaChegada: assignment?.horario_apresentacao ?? festa.hora_inicio,
    horaTermino: festa.hora_fim,
    localEvento: festa.partners?.nome ?? enderecoLivre ?? "",
    enderecoCompleto: festa.partners ? enderecoParceiro : enderecoLivre,
    clienteContratante: festa.contratante_nome ?? "",
  });

  const colaborador =
    assignment?.profiles?.nome_completo ?? assignment?.profiles?.nome_tio ?? "";
  const filename = nomeArquivoOS(os.numero, os.ano, colaborador);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
