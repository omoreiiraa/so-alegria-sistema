import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { eGestao } from "@/types/domain";
import { gerarOrcamentoPDF } from "@/lib/pdf/orcamento";
import { carregarDadosDaFesta } from "@/lib/pdf/festa-orcamento";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionProfile();
  if (!session || !eGestao(session.profile.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const dados = await carregarDadosDaFesta(id);
  if (!dados) {
    return NextResponse.json({ error: "Festa não encontrada" }, { status: 404 });
  }

  // Campo em branco não impede a emissão — o PDF mostra "-". Só uma falha
  // inesperada cai aqui, e ela vira uma mensagem, nunca um 500 cru na tela.
  let pdf: Uint8Array;
  try {
    pdf = await gerarOrcamentoPDF(dados.orcamento);
  } catch (e) {
    console.error("Falha ao gerar o orçamento:", e);
    return NextResponse.json(
      { error: "Não foi possível montar o orçamento. Tente de novo." },
      { status: 500 },
    );
  }

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orcamento-${dados.nomeArquivo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
