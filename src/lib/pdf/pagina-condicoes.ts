import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { embutirLogo } from "./logo";
import { CNPJ_SO_ALEGRIA } from "./orcamento";
import {
  A4,
  CINZA,
  GRAFITE,
  LARANJA,
  LARGURA_UTIL,
  LINHA,
  MARGEM,
  VERDE,
  sanitize,
  wrap,
  wrapMultilinha,
} from "./estilo";
import {
  CONDICOES_DE_CONTRATACAO,
  FORMA_DE_PAGAMENTO,
  OBSERVACOES_IMPORTANTES,
} from "./condicoes";

/**
 * Folha de condições do contrato. Só entra quando o contrato começa pelo
 * arquivo que o cliente devolveu — se o contrato começa pelo orçamento gerado
 * aqui, essas condições já estão nele e a folha repetiria o texto.
 */
export async function adicionarPaginaCondicoes(
  pdf: PDFDocument,
  observacoes: string | null,
): Promise<void> {
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embutirLogo(pdf);

  let page = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGEM;

  const garantirEspaco = (altura: number) => {
    if (y - altura < MARGEM) {
      page = pdf.addPage([A4.width, A4.height]);
      y = A4.height - MARGEM;
    }
  };

  const secao = (nome: string) => {
    garantirEspaco(34);
    y -= 8;
    page.drawText(sanitize(nome), {
      x: MARGEM,
      y,
      size: 10,
      font: bold,
      color: VERDE,
    });
    y -= 6;
    page.drawLine({
      start: { x: MARGEM, y },
      end: { x: A4.width - MARGEM, y },
      thickness: 0.75,
      color: LINHA,
    });
    y -= 16;
  };

  const paragrafo = (
    valor: string,
    opts: { negrito?: boolean; multilinha?: boolean } = {},
  ) => {
    const size = 9;
    const fonte = opts.negrito ? bold : regular;
    const linhas = (opts.multilinha ? wrapMultilinha : wrap)(
      valor,
      fonte,
      size,
      LARGURA_UTIL,
    );
    for (const l of linhas) {
      garantirEspaco(12);
      page.drawText(sanitize(l), {
        x: MARGEM,
        y,
        size,
        font: fonte,
        color: GRAFITE,
      });
      y -= 12;
    }
    y -= 5;
  };

  const topico = (valor: string) => {
    const size = 9;
    const RECUO = 14;
    const linhas = wrap(valor, regular, size, LARGURA_UTIL - RECUO);
    linhas.forEach((l, i) => {
      garantirEspaco(12);
      if (i === 0) {
        page.drawCircle({ x: MARGEM + 3, y: y + 3, size: 1.8, color: LARANJA });
      }
      page.drawText(sanitize(l), {
        x: MARGEM + RECUO,
        y,
        size,
        font: regular,
        color: GRAFITE,
      });
      y -= 12;
    });
    y -= 4;
  };

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  if (logo) {
    const LOGO = 62;
    y -= LOGO;
    page.drawImage(logo, { x: (A4.width - LOGO) / 2, y, width: LOGO, height: LOGO });
  }

  const centralizado = (
    valor: string,
    size: number,
    font: typeof bold,
    color: typeof VERDE,
  ) => {
    const s = sanitize(valor);
    page.drawText(s, {
      x: (A4.width - font.widthOfTextAtSize(s, size)) / 2,
      y,
      size,
      font,
      color,
    });
  };

  y -= 22;
  centralizado("SÓ ALEGRIA", 18, bold, VERDE);
  y -= 13;
  centralizado("RECREAÇÃO E DISCOTECA", 8, regular, LARANJA);
  y -= 12;
  centralizado(`CNPJ ${CNPJ_SO_ALEGRIA}`, 8, regular, CINZA);

  y -= 26;
  page.drawRectangle({
    x: MARGEM,
    y: y - 6,
    width: LARGURA_UTIL,
    height: 26,
    color: VERDE,
  });
  page.drawText("CONDIÇÕES DA CONTRATAÇÃO", {
    x: MARGEM + 12,
    y: y + 1,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });
  y -= 34;

  if (observacoes && observacoes.trim()) {
    secao("OBSERVAÇÕES");
    paragrafo(observacoes.trim(), { multilinha: true });
  }

  secao("FORMA DE PAGAMENTO");
  paragrafo(FORMA_DE_PAGAMENTO, { negrito: true });
  for (const condicao of CONDICOES_DE_CONTRATACAO) paragrafo(condicao);

  secao("OBSERVAÇÕES IMPORTANTES");
  for (const observacao of OBSERVACOES_IMPORTANTES) topico(observacao);

  // ── Rodapé ───────────────────────────────────────────────────────────────
  const rodape = sanitize(
    `Só Alegria — Recreação e Discoteca · CNPJ ${CNPJ_SO_ALEGRIA}`,
  );
  page.drawText(rodape, {
    x: (A4.width - regular.widthOfTextAtSize(rodape, 8)) / 2,
    y: MARGEM - 16,
    size: 8,
    font: regular,
    color: CINZA,
  });
}
