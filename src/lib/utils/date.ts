/**
 * Datas e horários sempre em America/Sao_Paulo. Ver docs/07-convencoes-codigo.md.
 * Datas de festa são armazenadas como `date` (YYYY-MM-DD) — tratadas como data local.
 */
export const TZ = "America/Sao_Paulo";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateLongFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Converte 'YYYY-MM-DD' para Date ao meio-dia local (evita salto de fuso). */
export function fromISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

/** Converte um Date para 'YYYY-MM-DD' usando os componentes locais (não UTC). */
export function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? fromISODate(iso.slice(0, 10)) : iso;
  return dateFmt.format(d);
}

export function formatDateLong(iso: string | Date): string {
  const d = typeof iso === "string" ? fromISODate(iso.slice(0, 10)) : iso;
  return dateLongFmt.format(d);
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return dateTimeFmt.format(d);
}

/** 'HH:MM:SS' | 'HH:MM' -> 'HH:MM'. */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/** Segunda-feira (00:00) da semana da data informada, no formato 'YYYY-MM-DD'. */
export function mondayOfWeek(iso: string): string {
  const d = fromISODate(iso.slice(0, 10));
  const day = d.getDay(); // 0=domingo … 6=sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Dia da semana (0=domingo … 6=sábado) de uma data 'YYYY-MM-DD'. */
export function weekday(iso: string): number {
  return fromISODate(iso.slice(0, 10)).getDay();
}

/** Data de hoje em America/Sao_Paulo, no formato 'YYYY-MM-DD'. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Soma (ou subtrai) dias a uma data 'YYYY-MM-DD'. */
export function addDaysISO(iso: string, n: number): string {
  const d = fromISODate(iso.slice(0, 10));
  d.setDate(d.getDate() + n);
  return toISODateLocal(d);
}

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;
