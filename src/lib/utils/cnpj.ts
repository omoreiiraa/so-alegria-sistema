/**
 * Validação e formatação de CNPJ, já no formato **alfanumérico** adotado pela
 * Receita Federal (IN RFB nº 2.229/2024):
 *
 * - continuam 14 caracteres no total;
 * - os 12 primeiros (raiz + ordem do estabelecimento) podem ser dígitos 0–9
 *   **ou** letras maiúsculas A–Z;
 * - os 2 últimos continuam sendo os dígitos verificadores, sempre numéricos.
 *
 * No módulo 11 cada caractere vale o seu código ASCII menos 48 ('0'→0 … '9'→9,
 * 'A'→17 … 'Z'→42), como manda a nota técnica. Para um CNPJ só de números a
 * conta dá exatamente o mesmo resultado do algoritmo antigo, então os CNPJs
 * já cadastrados seguem válidos.
 */

import { onlyDigits } from "./cpf";

export { onlyDigits };

/** Mantém só dígitos e letras maiúsculas — o alfabeto do CNPJ alfanumérico. */
export function onlyCnpj(v: string): string {
  return (v ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 14);
}

/** Peso do caractere no mód. 11: ASCII − 48 (dígito vale ele mesmo). */
function valorCaractere(c: string): number {
  return c.charCodeAt(0) - 48;
}

export function isValidCNPJ(input: string): boolean {
  const cnpj = onlyCnpj(input);
  // 12 posições alfanuméricas + 2 dígitos verificadores numéricos.
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  if (/^(.)\1{13}$/.test(cnpj)) return false; // todos iguais

  // Pesos do módulo 11: 5..2 seguido de 9..2, deslocando um a cada caractere.
  const calcDigit = (base: string): number => {
    let peso = base.length - 7;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += valorCaractere(base[i]) * peso;
      peso = peso - 1 < 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcDigit(cnpj.slice(0, 12));
  if (d1 !== Number(cnpj[12])) return false;
  const d2 = calcDigit(cnpj.slice(0, 13));
  return d2 === Number(cnpj[13]);
}

/** Formata progressivamente: 00.000.000/0000-00 (aceita letras nas 12 primeiras). */
export function formatCNPJ(input: string): string {
  const v = onlyCnpj(input);
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  const raiz = `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}`;
  return v.length <= 12 ? raiz : `${raiz}-${v.slice(12)}`;
}
