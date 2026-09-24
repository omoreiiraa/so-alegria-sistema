import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { eGestao } from "@/types/domain";
import { gerarOrcamentoPDF } from "@/lib/pdf/orcamento";
import { carregarDadosDaFesta } from "@/lib/pdf/festa-orcamento";
import { validadeOrcamento } from "@/lib/orcamento-validade";
import { createClient } from "@/lib/supabase/server";

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

  // A emissão fica gravada: é dela que contam os 5 dias de validade. Gerar de
  // novo um orçamento ainda válido reimprime o mesmo prazo; um vencido (ou que
  // nunca saiu) ganha emissão nova e volta da Recuperação para Orçamento.
  const { festa } = dados;
  let validade = validadeOrcamento(festa.orcamento_emitido_em, festa.created_at);
  if (
    festa.status === "orcamento" &&
    (festa.orcamento_emitido_em === null || validade.vencido)
  ) {
    const agora = new Date().toISOString();
    const supabase = await createClient();
    const { error } = await supabase
      .from("parties")
      .update({ orcamento_emitido_em: agora })
      .eq("id", id);
    if (error) console.error("Falha ao gravar a emissão do orçamento:", error);
    validade = validadeOrcamento(agora, festa.created_at);
  }

  // Campo em branco não impede a emissão — o PDF mostra "-". Só uma falha
  // inesperada cai aqui, e ela vira uma mensagem, nunca um 500 cru na tela.
  let pdf: Uint8Array;
  try {
    pdf = await gerarOrcamentoPDF({
      ...dados.orcamento,
      validade: { emitidoEm: validade.emitidoEm, validoAte: validade.validoAte },
    });
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
