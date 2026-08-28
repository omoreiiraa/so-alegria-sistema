/**
 * O banco guarda só o hash do token (ADR-0013), então o link em claro morre
 * assim que a página recarrega. Para o admin poder recopiar o convite que já
 * enviou — em vez de gerar outro e derrubar o que está no WhatsApp do
 * colaborador — guardamos a URL no navegador dele, indexada pelo id da linha
 * em colaborador_links.
 *
 * Fica só nesta máquina e some quando o link expira. Não substitui o banco:
 * se o admin abrir de outro computador, o caminho continua sendo gerar outro.
 */

const PREFIXO = "so-alegria:convite:";

type Guardado = { url: string; expira: number };

const ouvintes = new Set<() => void>();

function avisar() {
  for (const f of ouvintes) f();
}

/** localStorage lança em modo privado e com cookies bloqueados. */
function seguro<T>(fn: () => T, padrao: T): T {
  try {
    return fn();
  } catch {
    return padrao;
  }
}

export function lembrarConvite(linkId: string, url: string, expiraEm: string | null) {
  limparConvitesVencidos();
  const expira = expiraEm ? new Date(expiraEm).getTime() : Date.now() + 24 * 3600_000;
  seguro(() => {
    localStorage.setItem(
      PREFIXO + linkId,
      JSON.stringify({ url, expira } satisfies Guardado),
    );
  }, undefined);
  avisar();
}

export function lerConvite(linkId: string | null): string | null {
  if (!linkId) return null;
  return seguro(() => {
    const cru = localStorage.getItem(PREFIXO + linkId);
    if (!cru) return null;
    const g = JSON.parse(cru) as Guardado;
    if (!g?.url || g.expira <= Date.now()) {
      localStorage.removeItem(PREFIXO + linkId);
      return null;
    }
    return g.url;
  }, null);
}

export function esquecerConvite(linkId: string) {
  seguro(() => localStorage.removeItem(PREFIXO + linkId), undefined);
  avisar();
}

/** Varre e descarta o que já expirou, para o storage não crescer sem fim. */
function limparConvitesVencidos() {
  seguro(() => {
    const agora = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const chave = localStorage.key(i);
      if (!chave?.startsWith(PREFIXO)) continue;
      try {
        const g = JSON.parse(localStorage.getItem(chave) ?? "{}") as Guardado;
        if (!g?.expira || g.expira <= agora) localStorage.removeItem(chave);
      } catch {
        localStorage.removeItem(chave);
      }
    }
  }, undefined);
}

/** Assinatura para useSyncExternalStore. */
export function assinarConvites(callback: () => void) {
  ouvintes.add(callback);
  return () => {
    ouvintes.delete(callback);
  };
}
