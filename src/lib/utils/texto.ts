/** Compara texto sem acento e sem caixa: "chapeu" acha "CHAPÉU". */
export function normalizarTexto(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
