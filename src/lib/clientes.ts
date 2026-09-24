import { normalizarTexto } from "@/lib/utils/texto";
import { todayISO } from "@/lib/utils/date";

/**
 * Cliente não é tabela: é quem contratou as festas (`parties.contratante_nome`
 * + `telefone_contato`). Para Vendidos, festas do mesmo telefone são o mesmo
 * cliente; sem telefone, o nome decide. Ver ADR-0028.
 */
export function chaveCliente(p: {
  id: string;
  contratante: string | null;
  telefone: string | null;
}): string {
  const digitos = (p.telefone ?? "").replace(/\D/g, "");
  if (digitos) return `tel:${digitos}`;
  const nome = normalizarTexto(p.contratante ?? "");
  return nome ? `nome:${nome}` : `festa:${p.id}`;
}

/**
 * Próxima vez que a data da festa se repete, a partir de hoje (inclusive).
 * Festa de aniversário se repete todo ano: é a deixa do follow-up.
 * 29/02 cai em 28/02 nos anos sem o dia.
 */
export function proximaRepeticao(dataFesta: string, hoje: string = todayISO()): string {
  const [, mes, dia] = dataFesta.split("-").map(Number);
  const anoHoje = Number(hoje.slice(0, 4));
  const montar = (ano: number) => {
    const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
    const d = mes === 2 && dia === 29 && !bissexto ? 28 : dia;
    return `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };
  const esteAno = montar(anoHoje);
  return esteAno >= hoje ? esteAno : montar(anoHoje + 1);
}

/** Dias corridos entre duas datas YYYY-MM-DD. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

/** Link do WhatsApp com a mensagem pronta; sem número abre a escolha de contato. */
export function linkWhatsApp(numero: string, mensagem: string): string {
  const texto = encodeURIComponent(mensagem);
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
