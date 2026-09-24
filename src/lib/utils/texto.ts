/** Compara texto sem acento e sem caixa: "chapeu" acha "CHAPÉU". */
export function normalizarTexto(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Busca de cliente usada em Festas, Vendidos e Perdidos: acha pelo nome (sem
 * acento) ou pelo telefone. No telefone compara só os dígitos — o banco guarda
 * +55…, então "11 95050" e "(11) 95050-0543" acham o mesmo número.
 */
export function buscaCliente(
  busca: string,
  alvo: { nomes: (string | null)[]; telefone: string | null },
): boolean {
  const termo = normalizarTexto(busca);
  if (!termo) return true;
  if (normalizarTexto(alvo.nomes.filter(Boolean).join(" ")).includes(termo)) return true;
  const digitos = busca.replace(/\D/g, "");
  return digitos.length >= 3 && (alvo.telefone ?? "").replace(/\D/g, "").includes(digitos);
}
