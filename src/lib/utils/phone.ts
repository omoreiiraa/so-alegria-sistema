import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/** Valida e normaliza telefone para E.164 (DDI+DDD). Default Brasil. */
export function toE164(
  input: string,
  defaultCountry: CountryCode = "BR",
): string | null {
  const phone = parsePhoneNumberFromString(input ?? "", defaultCountry);
  if (!phone || !phone.isValid()) return null;
  return phone.number; // formato E.164, ex.: +5511987654321
}

export function isValidPhone(
  input: string,
  defaultCountry: CountryCode = "BR",
): boolean {
  return toE164(input, defaultCountry) !== null;
}

/** Exibição amigável (nacional quando possível). */
export function formatPhone(
  input: string,
  defaultCountry: CountryCode = "BR",
): string {
  const phone = parsePhoneNumberFromString(input ?? "", defaultCountry);
  if (!phone) return input;
  return phone.formatInternational();
}

/**
 * Exibição nacional a partir do que está guardado no banco (E.164):
 * "+5511950500543" -> "(11) 95050-0543".
 *
 * Não use `formatPhoneBR` direto num E.164: ele trata o "55" do país como DDD
 * e ainda corta os dígitos que sobram.
 */
export function formatPhoneNational(input: string | null | undefined): string {
  if (!input) return "";
  const phone = parsePhoneNumberFromString(input, "BR");
  if (phone?.isValid()) return phone.formatNational();

  // Não validou (número incompleto ou fora do padrão): tira o DDI, se houver.
  let digits = input.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  return formatPhoneBR(digits);
}

/**
 * Número no formato que o wa.me aceita: só dígitos, com DDI.
 * Deixa a cargo do libphonenumber decidir o que é DDI e o que é DDD — o DDD 55
 * (Santa Maria/RS) tornaria qualquer checagem por prefixo ambígua.
 * Devolve "" quando o número não é válido.
 */
export function toWhatsAppNumber(input: string | null | undefined): string {
  if (!input) return "";
  const phone = parsePhoneNumberFromString(input, "BR");
  if (!phone?.isValid()) return "";
  return phone.number.replace(/\D/g, "");
}

/** Máscara brasileira aplicada enquanto o usuário digita: (11) 98765-4321. */
export function formatPhoneBR(input: string): string {
  const d = (input ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
