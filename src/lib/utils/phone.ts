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

/** Máscara brasileira aplicada enquanto o usuário digita: (11) 98765-4321. */
export function formatPhoneBR(input: string): string {
  const d = (input ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
