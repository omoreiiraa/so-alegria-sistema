import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib";
import { LOGO_JPG_BASE64 } from "./logo";
import { formatBRL } from "@/lib/utils/money";
import { formatDate, formatTime } from "@/lib/utils/date";

export const CNPJ_SO_ALEGRIA = "03.103.012/0001-30";

/** Cores da marca (docs/05-design-system.md) convertidas para o espaço do PDF. */
const VERDE = rgb(0.13, 0.61, 0.35);
const LARANJA = rgb(0.95, 0.55, 0.13);
const GRAFITE = rgb(0.15, 0.15, 0.17);
const CINZA = rgb(0.42, 0.42, 0.46);
const LINHA = rgb(0.85, 0.85, 0.87);

const A4 = { width: 595.28, height: 841.89 };
const MARGEM = 48;
const LARGURA_UTIL = A4.width - MARGEM * 2;

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
  materiais: { nome: string; quantidade: number }[];
};

/**
 * As fontes padrão do PDF usam WinAnsi, que cobre o português mas quebra em
 * caracteres fora do Latin-1 (emoji, aspas curvas). Sanitiza antes de desenhar.
 */
function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "");
}

/** Quebra o texto em linhas que caibam na largura informada. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const palavras = sanitize(text).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [""];
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (font.widthOfTextAtSize(tentativa, size) <= maxWidth) {
      atual = tentativa;
    } else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function gerarOrcamentoPDF(d: OrcamentoData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Orçamento ${d.numero} — Só Alegria`);
  pdf.setProducer("Só Alegria — Recreação e Discoteca");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedJpg(Buffer.from(LOGO_JPG_BASE64, "base64"));

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
  const LOGO = 78;
  y -= LOGO;
  page.drawImage(logo, {
    x: (A4.width - LOGO) / 2,
    y,
    width: LOGO,
    height: LOGO,
  });

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

  // ── Materiais ────────────────────────────────────────────────────────────
  secao("MATERIAIS INCLUSOS");
  if (d.materiais.length === 0) {
    texto("Nenhum material vinculado a esta festa.", {
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
    garantirEspaco(58);
    y -= 12;
    page.drawRectangle({
      x: MARGEM,
      y: y - 12,
      width: LARGURA_UTIL,
      height: 40,
      color: rgb(0.96, 0.98, 0.96),
      borderColor: VERDE,
      borderWidth: 1,
    });
    page.drawText("VALOR TOTAL", {
      x: MARGEM + 14,
      y: y + 6,
      size: 10,
      font: bold,
      color: CINZA,
    });
    const valor = sanitize(formatBRL(d.valorFesta));
    page.drawText(valor, {
      x: A4.width - MARGEM - 14 - bold.widthOfTextAtSize(valor, 16),
      y: y + 2,
      size: 16,
      font: bold,
      color: VERDE,
    });
    y -= 44;
  }

  // ── Rodapé ───────────────────────────────────────────────────────────────
  const rodape = `Só Alegria — Recreação e Discoteca · CNPJ ${CNPJ_SO_ALEGRIA}`;
  page.drawText(sanitize(rodape), {
    x: (A4.width - regular.widthOfTextAtSize(sanitize(rodape), 8)) / 2,
    y: MARGEM - 16,
    size: 8,
    font: regular,
    color: CINZA,
  });

  return pdf.save();
}
