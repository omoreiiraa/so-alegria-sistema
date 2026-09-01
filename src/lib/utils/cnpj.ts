/** Validação e formatação de CNPJ (dígitos verificadores). */

import { onlyDigits } from "./cpf";

export { onlyDigits };

export function isValidCNPJ(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos iguais

  // Pesos do módulo 11: 5..2 seguido de 9..2, deslocando um a cada dígito.
  const calcDigit = (base: string): number => {
    let peso = base.length - 7;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso;
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

export function formatCNPJ(input: string): string {
  const cnpj = onlyDigits(input).slice(0, 14);
  return cnpj
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
