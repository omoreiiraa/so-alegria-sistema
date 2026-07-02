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
