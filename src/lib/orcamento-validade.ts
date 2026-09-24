import { TZ, addDaysISO, todayISO } from "@/lib/utils/date";

/**
 * O orçamento vale 5 dias corridos a partir da emissão (ADR-0027). Emitido no
 * dia 10, vale até o dia 15 inclusive; no dia 16 está vencido e, se a festa
 * continua em "Orçamento", aparece na coluna Recuperação.
 */
export const VALIDADE_ORCAMENTO_DIAS = 5;

/** Data (YYYY-MM-DD, em São Paulo) de um timestamp do banco. */
function dataLocal(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(timestamp));
}

export type ValidadeOrcamento = {
  /** Dia da emissão, YYYY-MM-DD. */
  emitidoEm: string;
  /** Último dia em que o orçamento vale, YYYY-MM-DD. */
  validoAte: string;
  vencido: boolean;
  /** Dias até vencer (0 = vence hoje). Negativo quando já venceu. */
  diasRestantes: number;
};

/**
 * `emitidoEm` é `parties.orcamento_emitido_em`; enquanto ele está vazio a
 * validade conta de `created_at`.
 */
export function validadeOrcamento(
  emitidoEm: string | null,
  criadoEm: string,
  hoje: string = todayISO(),
): ValidadeOrcamento {
  const emissao = dataLocal(emitidoEm ?? criadoEm);
  const validoAte = addDaysISO(emissao, VALIDADE_ORCAMENTO_DIAS);
  const diasRestantes = Math.round(
    (Date.parse(`${validoAte}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86_400_000,
  );
  return { emitidoEm: emissao, validoAte, vencido: diasRestantes < 0, diasRestantes };
}
