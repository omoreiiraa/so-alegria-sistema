/** Formatação monetária em BRL. Ver docs/07-convencoes-codigo.md. */
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return brl.format(0);
  const n = typeof value === "string" ? Number(value) : value;
  return brl.format(Number.isFinite(n) ? n : 0);
}

/**
 * Máscara aplicada enquanto o usuário digita em um campo de valor: os dígitos
 * entram pela direita, como numa maquininha. "12345" -> "123,45".
 */
export function formatBRLInput(input: string): string {
  const digits = (input ?? "").replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  const cents = digits.padStart(3, "0");
  const inteiro = cents.slice(0, -2).replace(/^0+(?=\d)/, "");
  const centavos = cents.slice(-2);
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${centavos}`;
}

/** Converte o texto mascarado ("1.234,56") no número guardado no banco (1234.56). */
export function parseBRLInput(masked: string): number | null {
  const digits = (masked ?? "").replace(/\D/g, "");
  if (digits.length === 0) return null;
  return Number(digits) / 100;
}
