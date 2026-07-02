/**
 * Validação de RG.
 *
 * O RG não tem padrão nacional de dígito verificador — cada estado emite de um jeito.
 * A validação por biblioteca (js-brasil) é inadequada aqui (exige prefixo de UF e é
 * inconsistente). Usamos o algoritmo do **RG-SP** (mód. 11), padrão de fato, já que a
 * empresa é de São Paulo. Formato: 8 dígitos base + 1 dígito verificador (0–9 ou X).
 */

export function onlyRg(v: string): string {
  return (v ?? "").toUpperCase().replace(/[^0-9X]/g, "");
}

/** Dígito verificador do RG-SP para os 8 dígitos base. */
function spCheckDigit(base8: string): string {
  const n = base8.padStart(8, "0");
  let sum = 0;
  // pesos 2..9, do dígito mais à direita para o mais à esquerda
  for (let i = 0; i < 8; i++) {
    sum += Number(n[7 - i]) * (i + 2);
  }
  const mod = sum % 11;
  return mod === 10 ? "X" : String(mod);
}

export function isValidRG(input: string): boolean {
  const rg = onlyRg(input);
  if (rg.length !== 9) return false; // 8 base + 1 verificador
  const base = rg.slice(0, 8);
  const dv = rg[8];
  if (!/^\d{8}$/.test(base)) return false;
  if (/^(\d)\1{7}$/.test(base)) return false; // base toda igual
  return spCheckDigit(base) === dv;
}

/** Formata progressivamente: 00.000.000-0. */
export function formatRG(input: string): string {
  const v = onlyRg(input).slice(0, 9);
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}-${v.slice(8)}`;
}
