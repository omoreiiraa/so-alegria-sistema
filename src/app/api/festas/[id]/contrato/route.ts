import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarContratoPDF } from "@/lib/pdf/contrato";
import { formatPhoneNational } from "@/lib/utils/phone";

/**
 * Contrato do evento: o orçamento devolvido pelo cliente com a página de dados
 * da empresa no fim. Montado a cada download, e não guardado pronto, para
 * acompanhar mudanças nos dados da festa. Ver ADR-0019.
 */
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

  const { data: festa } = await supabase
    .from("parties")
    .select(
      `id, data, hora_inicio, hora_fim, contratante_nome, telefone_contato,
       logradouro, numero, bairro, cidade, orcamento_assinado_path`,
    )
    .eq("id", id)
    .single();

  if (!festa) {
    return NextResponse.json(
      { error: "Festa não encontrada" },
      { status: 404 },
    );
  }
  if (!festa.orcamento_assinado_path) {
    return NextResponse.json(
      {
        error:
          "Anexe o orçamento devolvido pelo cliente antes de gerar o contrato.",
      },
      { status: 409 },
    );
  }

  const { data: blob, error } = await supabase.storage
    .from("contratos")
    .download(festa.orcamento_assinado_path);
  if (error || !blob) {
    return NextResponse.json(
      { error: "Não foi possível ler o orçamento anexado." },
      { status: 502 },
    );
  }

  // O anexo vem de fora: PDF protegido por senha ou arquivo truncado quebram a
  // leitura, e isso é erro do arquivo, não do servidor.
  let pdf: Uint8Array;
  try {
    pdf = await gerarContratoPDF(
      {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        contentType: blob.type || null,
        nome: festa.orcamento_assinado_path,
      },
      {
        clienteNome: festa.contratante_nome,
        telefoneContato: festa.telefone_contato
          ? formatPhoneNational(festa.telefone_contato)
          : null,
        logradouro: festa.logradouro,
        numero: festa.numero,
        bairro: festa.bairro,
        cidade: festa.cidade,
        data: festa.data,
        horaInicio: festa.hora_inicio,
        horaFim: festa.hora_fim,
      },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível ler o orçamento anexado. Reenvie como PDF ou foto (JPG/PNG).",
      },
      { status: 422 },
    );
  }

  const nomeCliente = (festa.contratante_nome ?? "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contrato-${nomeCliente}-${festa.data}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
