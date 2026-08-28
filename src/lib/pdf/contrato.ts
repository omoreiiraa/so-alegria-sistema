import { PDFDocument } from "pdf-lib";
import {
  adicionarPaginaDadosEmpresa,
  type DadosEmpresaData,
} from "./dados-empresa";
import { bytesParaPdf } from "./bytes";

/**
 * Contrato do evento = orçamento devolvido pelo cliente + página de dados da
 * empresa. O orçamento devolvido é o arquivo que o admin anexa: pode voltar
 * como PDF ou como foto da folha assinada, então os dois entram.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGEM = 24;

export type ArquivoAnexado = {
  bytes: Uint8Array;
  /** MIME do arquivo guardado no bucket; usado para escolher como embutir. */
  contentType: string | null;
  nome: string;
};

export function ehImagem(contentType: string | null, nome: string): boolean {
  const t = (contentType ?? "").toLowerCase();
  if (t.startsWith("image/")) return true;
  return /\.(jpe?g|png)$/i.test(nome);
}

/** Copia as páginas do orçamento devolvido, seja ele PDF ou foto. */
async function copiarAnexo(pdf: PDFDocument, anexo: ArquivoAnexado) {
  if (ehImagem(anexo.contentType, anexo.nome)) {
    const png = /png/i.test(anexo.contentType ?? "") || /\.png$/i.test(anexo.nome);
    const bytes = bytesParaPdf(anexo.bytes);
    const img = png ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

    // A foto entra numa folha A4 inteira, sem distorcer o que foi escrito nela.
    const page = pdf.addPage([A4.width, A4.height]);
    const max = { w: A4.width - MARGEM * 2, h: A4.height - MARGEM * 2 };
    const escala = Math.min(max.w / img.width, max.h / img.height, 1);
    const w = img.width * escala;
    const h = img.height * escala;
    page.drawImage(img, {
      x: (A4.width - w) / 2,
      y: (A4.height - h) / 2,
      width: w,
      height: h,
    });
    return;
  }

  const origem = await PDFDocument.load(anexo.bytes);
  const paginas = await pdf.copyPages(origem, origem.getPageIndices());
  for (const p of paginas) pdf.addPage(p);
}

/**
 * `anexo` é o que o cliente devolveu. Quando ele ainda não devolveu nada, entra
 * o orçamento que o próprio sistema gera — assim o contrato sai de qualquer
 * jeito, e o escritório pode mandar tudo de uma vez.
 */
export async function gerarContratoPDF(
  anexo: ArquivoAnexado,
  dados: DadosEmpresaData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Contrato do evento — Só Alegria");
  pdf.setProducer("Só Alegria — Recreação e Discoteca");

  await copiarAnexo(pdf, anexo);
  await adicionarPaginaDadosEmpresa(pdf, dados);

  return pdf.save();
}
