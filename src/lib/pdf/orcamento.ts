import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { embutirLogo } from "./logo";
import { formatBRL } from "@/lib/utils/money";
import { formatDate, formatTime } from "@/lib/utils/date";
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

export const CNPJ_SO_ALEGRIA = "03.103.012/0001-30";

export type OrcamentoData = {
  numero: string;
  clienteNome: string | null;
  aniversarianteNome: string | null;
  aniversarianteIdade: number | null;
  telefoneContato: string | null;
  endereco: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  qtdCriancas: number | null;
  temaFesta: string | null;
  qtdRecreadores: number | null;
  valorFesta: number | null;
  /** Observação escrita pelo escritório para o cliente ler. */
  observacoes: string | null;
  materiais: { nome: string; quantidade: number }[];
};

export async function gerarOrcamentoPDF(d: OrcamentoData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Orçamento ${d.numero} — Só Alegria`);
  pdf.setProducer("Só Alegria — Recreação e Discoteca");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embutirLogo(pdf);

  let page = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGEM;

  const texto = (
    value: string,
    opts: { size?: number; font?: PDFFont; color?: typeof GRAFITE; x?: number },
  ) => {
    page.drawText(sanitize(value), {
      x: opts.x ?? MARGEM,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? regular,
      color: opts.color ?? GRAFITE,
    });
  };

  /** Garante espaço vertical; abre outra página quando o conteúdo estoura. */
  const garantirEspaco = (altura: number) => {
    if (y - altura < MARGEM) {
      page = pdf.addPage([A4.width, A4.height]);
      y = A4.height - MARGEM;
    }
  };

  // ── Cabeçalho: logo centralizada + identificação da empresa ──────────────
  if (logo) {
    const LOGO = 78;
    y -= LOGO;
    page.drawImage(logo, {
      x: (A4.width - LOGO) / 2,
      y,
      width: LOGO,
      height: LOGO,
    });
  }

  y -= 26;
  const titulo = "SÓ ALEGRIA";
  const tituloSize = 22;
  page.drawText(sanitize(titulo), {
    x: (A4.width - bold.widthOfTextAtSize(titulo, tituloSize)) / 2,
    y,
    size: tituloSize,
    font: bold,
    color: VERDE,
  });

  y -= 15;
  const sub = "RECREAÇÃO E DISCOTECA";
  const subSize = 9;
  page.drawText(sanitize(sub), {
    x: (A4.width - regular.widthOfTextAtSize(sanitize(sub), subSize)) / 2,
    y,
    size: subSize,
    font: regular,
    color: LARANJA,
  });

  y -= 14;
  const cnpj = `CNPJ ${CNPJ_SO_ALEGRIA}`;
  page.drawText(sanitize(cnpj), {
    x: (A4.width - regular.widthOfTextAtSize(sanitize(cnpj), 9)) / 2,
    y,
    size: 9,
    font: regular,
    color: CINZA,
  });

  // ── Faixa do documento ───────────────────────────────────────────────────
  y -= 30;
  page.drawRectangle({
    x: MARGEM,
    y: y - 6,
    width: LARGURA_UTIL,
    height: 26,
    color: VERDE,
  });
  page.drawText("ORÇAMENTO", {
    x: MARGEM + 12,
    y: y + 1,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });
  const numeroLabel = sanitize(`Nº ${d.numero}`);
  page.drawText(numeroLabel, {
    x: A4.width - MARGEM - 12 - bold.widthOfTextAtSize(numeroLabel, 10),
    y: y + 2,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });

  y -= 34;

  // ── Blocos de informação ─────────────────────────────────────────────────
  const secao = (nome: string) => {
    garantirEspaco(34);
    y -= 6;
    texto(nome, { size: 10, font: bold, color: VERDE });
    y -= 6;
    page.drawLine({
      start: { x: MARGEM, y },
      end: { x: A4.width - MARGEM, y },
      thickness: 0.75,
      color: LINHA,
    });
    y -= 16;
  };

  const linha = (rotulo: string, valor: string) => {
    const rotuloSize = 9;
    const valorSize = 10;
    const rotuloLargura = 132;
    const linhasValor = wrap(
      valor || "-",
      regular,
      valorSize,
      LARGURA_UTIL - rotuloLargura,
    );
    garantirEspaco(linhasValor.length * 14 + 4);

    texto(rotulo.toUpperCase(), { size: rotuloSize, font: bold, color: CINZA });
    linhasValor.forEach((l, i) => {
      page.drawText(sanitize(l), {
        x: MARGEM + rotuloLargura,
        y: y - i * 13,
        size: valorSize,
        font: regular,
        color: GRAFITE,
      });
    });
    y -= linhasValor.length * 13 + 5;
  };

  /** Texto corrido do documento, quebrado na largura útil. */
  const paragrafo = (
    valor: string,
    opts: { font?: PDFFont; color?: typeof GRAFITE; multilinha?: boolean } = {},
  ) => {
    const size = 9;
    const fonte = opts.font ?? regular;
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
        color: opts.color ?? GRAFITE,
      });
      y -= 12;
    }
    y -= 5;
  };

  /** Item de lista, com marcador laranja e recuo. */
  const topico = (valor: string) => {
    const size = 9;
    const RECUO = 14;
    const linhas = wrap(valor, regular, size, LARGURA_UTIL - RECUO);
    linhas.forEach((l, i) => {
      garantirEspaco(12);
      // O marcador só na primeira linha; a continuação alinha pelo recuo.
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

  secao("DADOS DO CLIENTE");
  linha("Cliente", d.clienteNome ?? "-");
  linha("Telefone de contato", d.telefoneContato ?? "-");
  linha("Endereço", d.endereco);

  secao("DADOS DO EVENTO");
  linha("Aniversariante", d.aniversarianteNome ?? "-");
  linha(
    "Idade",
    d.aniversarianteIdade != null ? `${d.aniversarianteIdade} anos` : "-",
  );
  linha("Data do evento", formatDate(d.data));
  linha(
    "Horário",
    `${formatTime(d.horaInicio)} às ${formatTime(d.horaFim)}`,
  );
  linha("Tema da festa", d.temaFesta ?? "-");
  linha(
    "Crianças convidadas",
    d.qtdCriancas != null ? `${d.qtdCriancas}` : "-",
  );
  linha(
    "Recreadores/monitores",
    d.qtdRecreadores != null ? `${d.qtdRecreadores}` : "-",
  );

  // ── Serviço prestado ─────────────────────────────────────────────────────
  secao("SERVIÇO PRESTADO");
  if (d.materiais.length === 0) {
    texto("Nenhum item vinculado a esta festa.", {
      size: 10,
      color: CINZA,
    });
    y -= 18;
  } else {
    for (const m of d.materiais) {
      garantirEspaco(16);
      const nome = wrap(m.nome, regular, 10, LARGURA_UTIL - 90)[0];
      page.drawCircle({
        x: MARGEM + 3,
        y: y + 3,
        size: 1.8,
        color: LARANJA,
      });
      page.drawText(sanitize(nome), {
        x: MARGEM + 14,
        y,
        size: 10,
        font: regular,
        color: GRAFITE,
      });
      const qtd = `${m.quantidade} un.`;
      page.drawText(sanitize(qtd), {
        x: A4.width - MARGEM - regular.widthOfTextAtSize(qtd, 10),
        y,
        size: 10,
        font: regular,
        color: CINZA,
      });
      y -= 16;
    }
  }

  // ── Valor ────────────────────────────────────────────────────────────────
  if (d.valorFesta != null) {
    const CAIXA_ALTURA = 40;
    const RESPIRO = 20;
    // A caixa cresce para BAIXO a partir do cursor: desenhar para cima
    // invadiria a última linha da lista de materiais.
    garantirEspaco(CAIXA_ALTURA + RESPIRO);
    y -= RESPIRO;
    const base = y - CAIXA_ALTURA;

    page.drawRectangle({
      x: MARGEM,
      y: base,
      width: LARGURA_UTIL,
      height: CAIXA_ALTURA,
      color: rgb(0.96, 0.98, 0.96),
      borderColor: VERDE,
      borderWidth: 1,
    });
    // Rótulo e valor compartilham a linha de base, centralizada na caixa.
    const linhaBase = base + 14;
    page.drawText("VALOR TOTAL", {
      x: MARGEM + 14,
      y: linhaBase,
      size: 10,
      font: bold,
      color: CINZA,
    });
    const valor = sanitize(formatBRL(d.valorFesta));
    page.drawText(valor, {
      x: A4.width - MARGEM - 14 - bold.widthOfTextAtSize(valor, 16),
      y: linhaBase,
      size: 16,
      font: bold,
      color: VERDE,
    });
    y = base - 16;
  }

  // ── Observações escritas para o cliente ──────────────────────────────────
  if (d.observacoes && d.observacoes.trim()) {
    secao("OBSERVAÇÕES");
    paragrafo(d.observacoes.trim(), { multilinha: true });
  }

  // ── Condições de contratação (texto fixo, ver ./condicoes.ts) ────────────
  secao("FORMA DE PAGAMENTO");
  paragrafo(FORMA_DE_PAGAMENTO, { font: bold });
  for (const condicao of CONDICOES_DE_CONTRATACAO) paragrafo(condicao);

  secao("OBSERVAÇÕES IMPORTANTES");
  for (const observacao of OBSERVACOES_IMPORTANTES) topico(observacao);
  y -= 6;

  // ── Rodapé (em todas as páginas, inclusive quando a lista pagina) ────────
  const rodape = sanitize(
    `Só Alegria — Recreação e Discoteca · CNPJ ${CNPJ_SO_ALEGRIA}`,
  );
  const rodapeX = (A4.width - regular.widthOfTextAtSize(rodape, 8)) / 2;
  for (const p of pdf.getPages()) {
    p.drawText(rodape, {
      x: rodapeX,
      y: MARGEM - 16,
      size: 8,
      font: regular,
      color: CINZA,
    });
  }

  return pdf.save();
}
