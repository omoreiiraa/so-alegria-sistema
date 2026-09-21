/**
 * Validação de RG.
 *
 * O RG **não tem padrão nacional**: cada estado emite do seu jeito, com
 * quantidades de dígitos diferentes (de 5 a 10+) e regras próprias de dígito
 * verificador — quando existe. A versão anterior exigia o formato do RG-SP
 * (8 dígitos + 1 DV mód. 11, sempre 9 caracteres) e isso barrou colaborador
 * com RG de 10 dígitos na hora do cadastro, em produção.
 *
 * Agora conferimos só formato e tamanho. A conferência de verdade é o
 * escritório olhando a foto do documento — não vale travar o cadastro de
 * quem tem um RG legítimo por causa de um algoritmo que só vale para SP.
 */

/** Menor RG que ainda faz sentido (documentos antigos são curtos). */
export const RG_MIN = 5;
/** Teto folgado: nenhum estado emite RG maior que isto. */
export const RG_MAX = 14;

/** Mantém só dígitos e o X, usado como dígito verificador em vários estados. */
export function onlyRg(v: string): string {
  return (v ?? "").toUpperCase().replace(/[^0-9X]/g, "");
}

export function isValidRG(input: string): boolean {
  const rg = onlyRg(input);
  if (rg.length < RG_MIN || rg.length > RG_MAX) return false;
  // O X só vale como dígito verificador, na última posição.
  if (!/^\d+[0-9X]$/.test(rg)) return false;
  if (/^(\d)\1+$/.test(rg)) return false; // 00000000, 11111111...
  return true;
}

/** Formata progressivamente: 00.000.000-0 (e 00.000.000-00 em RG mais longo). */
export function formatRG(input: string): string {
  const v = onlyRg(input).slice(0, RG_MAX);
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}-${v.slice(8)}`;
}
