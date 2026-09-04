import { rgb, type PDFFont } from "pdf-lib";

/**
 * Estilo comum dos PDFs (orçamento, dados da empresa, condições). Estava
 * duplicado em cada arquivo; ficou num módulo só para as três folhas saírem
 * iguais quando a marca mudar.
 */

/** Cores da marca (docs/05-design-system.md) convertidas para o espaço do PDF. */
export const VERDE = rgb(0.13, 0.61, 0.35);
export const LARANJA = rgb(0.95, 0.55, 0.13);
export const GRAFITE = rgb(0.15, 0.15, 0.17);
export const CINZA = rgb(0.42, 0.42, 0.46);
export const LINHA = rgb(0.85, 0.85, 0.87);
export const BRANCO = rgb(1, 1, 1);

export const A4 = { width: 595.28, height: 841.89 };
export const MARGEM = 48;
export const LARGURA_UTIL = A4.width - MARGEM * 2;

/** Tipo de cor aceito pelo pdf-lib, para os helpers de desenho. */
export type Cor = typeof GRAFITE;

/**
 * As fontes padrão do PDF usam WinAnsi, que cobre o português mas quebra em
 * caracteres fora do Latin-1 (emoji, aspas curvas). Sanitiza antes de desenhar.
 */
export function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "");
}

/** Quebra o texto em linhas que caibam na largura informada. */
export function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
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

/**
 * Igual ao `wrap`, mas respeita as quebras de linha que a pessoa digitou —
 * usado no texto livre de observações, onde a lista que ela escreveu não pode
 * virar um parágrafo corrido. Linha em branco vira espaço em branco.
 */
export function wrapMultilinha(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((linha) =>
      linha.trim() ? wrap(linha, font, size, maxWidth) : [""],
    );
}
