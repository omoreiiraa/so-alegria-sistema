import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { embutirLogo } from "./logo";
import { CNPJ_SO_ALEGRIA } from "./orcamento";
import { formatDate, formatTime } from "@/lib/utils/date";

/**
 * Página "Dados da empresa" — a segunda folha do contrato. Reproduz o documento
 * que o escritório mandava solto no WhatsApp: dados bancários para o depósito,
 * PIX, o cadastro de pessoa física que o cliente preenche e a cláusula de
 * cancelamento.
 *
 * É desenhada com pdf-lib em vez de converter o .docx: converter exigiria
 * LibreOffice no servidor, que não roda no free tier da Vercel. Ver ADR-0019.
 */

const VERDE = rgb(0.13, 0.61, 0.35);
const LARANJA = rgb(0.95, 0.55, 0.13);
const GRAFITE = rgb(0.15, 0.15, 0.17);
const CINZA = rgb(0.42, 0.42, 0.46);
const LINHA = rgb(0.85, 0.85, 0.87);

const A4 = { width: 595.28, height: 841.89 };
const MARGEM = 48;
const LARGURA_UTIL = A4.width - MARGEM * 2;

/** Dados da empresa. Ficam aqui por serem o conteúdo do documento, não config. */
export const CONTA = {
  razaoSocial: "SÓ ALEGRIA RECREAÇÃO INFANTIL LTDA-ME",
  banco: "Banco ITAÚ",
  agencia: "0333",
  contaCorrente: "13350-2",
  email: "contato@eventossoalegria.com.br",
  pixChave: CNPJ_SO_ALEGRIA,
  pixBanco: "BANCO ITAÚ",
};

export const CLAUSULA_CANCELAMENTO =
  "Não faremos a devolução dos 50% inicial ou pagamento total caso haja " +
  "cancelamento; o valor já efetuado ficará como crédito para um próximo evento.";

/** O que o sistema já sabe da festa e usa para adiantar o cadastro do cliente. */
export type DadosEmpresaData = {
  clienteNome: string | null;
  telefoneContato: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  data: string | null;
  horaInicio: string | null;
  horaFim: string | null;
};

function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const palavras = sanitize(text).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [""];
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (font.widthOfTextAtSize(tentativa, size) <= maxWidth) atual = tentativa;
    else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/**
 * Acrescenta a página ao documento recebido, para o contrato sair num PDF só.
 */
export async function adicionarPaginaDadosEmpresa(
  pdf: PDFDocument,
  d: DadosEmpresaData,
): Promise<void> {
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embutirLogo(pdf);

  const page = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - MARGEM;

  const texto = (
    value: string,
    opts: {
      size?: number;
      font?: PDFFont;
      color?: typeof GRAFITE;
      x?: number;
    } = {},
  ) => {
    page.drawText(sanitize(value), {
      x: opts.x ?? MARGEM,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? regular,
      color: opts.color ?? GRAFITE,
    });
  };

  const centralizado = (
    value: string,
    size: number,
    font: PDFFont,
    color: typeof GRAFITE,
  ) => {
    const s = sanitize(value);
    page.drawText(s, {
      x: (A4.width - font.widthOfTextAtSize(s, size)) / 2,
      y,
      size,
      font,
      color,
    });
  };

  const secao = (nome: string) => {
    y -= 8;
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

  /** Rótulo com o valor já preenchido, ou uma linha para preencher à mão. */
  const campo = (
    rotulo: string,
    valor: string | null,
    opts: { x?: number; largura?: number } = {},
  ) => {
    const x = opts.x ?? MARGEM;
    const largura = opts.largura ?? LARGURA_UTIL;
    const rotuloTexto = sanitize(`${rotulo}:`);
    page.drawText(rotuloTexto, {
      x,
      y,
      size: 9,
      font: bold,
      color: CINZA,
    });
    const inicio = x + bold.widthOfTextAtSize(rotuloTexto, 9) + 6;
    const fim = x + largura;
    if (valor) {
      page.drawText(sanitize(valor), {
        x: inicio,
        y,
        size: 10,
        font: regular,
        color: GRAFITE,
      });
    }
    // A linha aparece mesmo com valor: o cliente pode corrigir por cima.
    page.drawLine({
      start: { x: inicio, y: y - 3 },
      end: { x: fim, y: y - 3 },
      thickness: 0.5,
      color: LINHA,
    });
  };

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  if (logo) {
    const LOGO = 62;
    y -= LOGO;
    page.drawImage(logo, { x: (A4.width - LOGO) / 2, y, width: LOGO, height: LOGO });
  }

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
  page.drawText("DADOS DA EMPRESA", {
    x: MARGEM + 12,
    y: y + 1,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });

  y -= 30;
  for (const l of wrap(
    "Segue abaixo os dados da empresa. Qualquer dúvida, entre em contato conosco.",
    regular,
    9,
    LARGURA_UTIL,
  )) {
    texto(l, { size: 9, color: CINZA });
    y -= 12;
  }

  // ── Depósito ─────────────────────────────────────────────────────────────
  secao("CONTA PARA DEPÓSITO");
  texto(CONTA.razaoSocial, { size: 10, font: bold });
  y -= 14;
  texto(`CNPJ ${CNPJ_SO_ALEGRIA}`, { size: 10 });
  y -= 14;
  texto(`${CONTA.banco} · Agência ${CONTA.agencia}`, { size: 10 });
  y -= 14;
  texto(`Conta Corrente ${CONTA.contaCorrente}`, { size: 10 });
  y -= 18;
  for (const l of wrap(
    `Feito o depósito, por gentileza enviar o comprovante por e-mail (${CONTA.email}) para a confirmação do mesmo.`,
    regular,
    9,
    LARGURA_UTIL,
  )) {
    texto(l, { size: 9, color: CINZA });
    y -= 12;
  }

  // ── PIX ──────────────────────────────────────────────────────────────────
  secao("PIX");
  texto(CONTA.pixBanco, { size: 10 });
  y -= 14;
  texto(`Chave (CNPJ): ${CONTA.pixChave}`, { size: 10, font: bold });
  y -= 14;
  texto(CONTA.razaoSocial, { size: 10 });
  y -= 18;

  // ── Cadastro do cliente ──────────────────────────────────────────────────
  secao("CADASTRO DE PESSOA FÍSICA — É NECESSÁRIO O PREENCHIMENTO");

  const horario =
    d.horaInicio && d.horaFim
      ? `${formatTime(d.horaInicio)} às ${formatTime(d.horaFim)}`
      : null;

  const META = (LARGURA_UTIL - 16) / 2;

  campo("Nome", d.clienteNome);
  y -= 26;
  campo("CPF", null, { largura: META });
  campo("RG", null, { x: MARGEM + META + 16, largura: META });
  y -= 26;
  campo("Endereço da festa", d.logradouro);
  y -= 26;
  campo("Número", d.numero, { largura: META });
  campo("Bairro", d.bairro, { x: MARGEM + META + 16, largura: META });
  y -= 26;
  campo("Cidade", d.cidade);
  y -= 26;
  campo("Data da festa", d.data ? formatDate(d.data) : null, { largura: META });
  campo("Horário da festa", horario, { x: MARGEM + META + 16, largura: META });
  y -= 26;
  campo("Telefone", d.telefoneContato);
  y -= 24;

  // ── Cancelamento ─────────────────────────────────────────────────────────
  const linhasClausula = wrap(CLAUSULA_CANCELAMENTO, bold, 9, LARGURA_UTIL - 24);
  const alturaCaixa = linhasClausula.length * 12 + 20;
  const base = y - alturaCaixa;
  page.drawRectangle({
    x: MARGEM,
    y: base,
    width: LARGURA_UTIL,
    height: alturaCaixa,
    color: rgb(0.99, 0.96, 0.93),
    borderColor: LARANJA,
    borderWidth: 1,
  });
  linhasClausula.forEach((l, i) => {
    page.drawText(sanitize(l), {
      x: MARGEM + 12,
      y: base + alturaCaixa - 16 - i * 12,
      size: 9,
      font: bold,
      color: GRAFITE,
    });
  });

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
