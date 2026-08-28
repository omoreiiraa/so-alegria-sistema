/**
 * O pdf-lib monta o DataView a partir de `bytes.buffer` e **ignora o
 * byteOffset** (`JpegEmbedder.js:43`: `new DataView(imageData.buffer)`).
 *
 * Um `Buffer` do Node é uma janela sobre um pool compartilhado. Quando ele vem
 * com offset — o que acontece no runtime da Vercel, mas não no Node local —, o
 * pdf-lib lê do começo do pool em vez do começo da imagem e estoura com
 * "SOI not found in JPEG", mesmo com os bytes perfeitamente válidos.
 *
 * Copiar para um Uint8Array próprio garante offset 0 e tamanho exato.
 */
export function bytesParaPdf(entrada: Uint8Array | ArrayBuffer): Uint8Array {
  const view =
    entrada instanceof Uint8Array ? entrada : new Uint8Array(entrada);
  const donoDoBuffer =
    view.byteOffset === 0 && view.byteLength === view.buffer.byteLength;
  return donoDoBuffer ? view : new Uint8Array(view);
}
