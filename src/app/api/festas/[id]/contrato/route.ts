import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gerarContratoPDF, type ArquivoAnexado } from "@/lib/pdf/contrato";
import { gerarOrcamentoPDF } from "@/lib/pdf/orcamento";
import { carregarDadosDaFesta } from "@/lib/pdf/festa-orcamento";

/**
 * Contrato do evento: o orçamento seguido da folha de dados da empresa.
 *
 * A primeira página é o arquivo que o cliente preencheu e devolveu, quando ele
 * existe. Sem isso, o sistema gera o orçamento na hora — o contrato sai
 * assim mesmo, em vez de travar esperando o cliente.
 *
 * Montado a cada download, e não guardado, para acompanhar mudanças na festa.
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
  const dados = await carregarDadosDaFesta(id);
  if (!dados) {
    return NextResponse.json({ error: "Festa não encontrada" }, { status: 404 });
  }

  const caminho = dados.festa.orcamento_assinado_path;
  let anexo: ArquivoAnexado;

  if (caminho) {
    const supabase = await createClient();
    const { data: blob, error } = await supabase.storage
      .from("contratos")
      .download(caminho);
    if (error || !blob) {
      return NextResponse.json(
        { error: "Não foi possível ler o orçamento anexado." },
        { status: 502 },
      );
    }
    anexo = {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      contentType: blob.type || null,
      nome: caminho,
    };
  } else {
    // Sem devolução do cliente, o contrato começa pelo orçamento do sistema.
    anexo = {
      bytes: await gerarOrcamentoPDF(dados.orcamento),
      contentType: "application/pdf",
      nome: "orcamento.pdf",
    };
  }

  let pdf: Uint8Array;
  try {
    pdf = await gerarContratoPDF(anexo, dados.dadosEmpresa);
  } catch (e) {
    console.error("Falha ao montar o contrato:", e);
    return NextResponse.json(
      {
        error: caminho
          ? "Não foi possível ler o orçamento anexado. Reenvie como PDF ou foto (JPG/PNG)."
          : "Não foi possível montar o contrato. Tente de novo.",
      },
      { status: caminho ? 422 : 500 },
    );
  }

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contrato-${dados.nomeArquivo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
