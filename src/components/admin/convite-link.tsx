"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, MessageCircle, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gerarConvite } from "@/actions/links";
import { toWhatsAppNumber } from "@/lib/utils/phone";
import { formatDate, formatDateTime } from "@/lib/utils/date";
import {
  assinarConvites,
  esquecerConvite,
  lembrarConvite,
  lerConvite,
} from "@/lib/convite-cache";

export type ConviteLinkRow = {
  id: string;
  expira_em: string | null;
  usado_em: string | null;
  revogado_em: string | null;
  created_at: string;
};

/** Convite mais recente que ainda vale, se houver. */
function vigente(links: ConviteLinkRow[]) {
  const agora = Date.now();
  return links
    .filter(
      (l) =>
        !l.usado_em &&
        !l.revogado_em &&
        l.expira_em !== null &&
        new Date(l.expira_em).getTime() > agora,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function ConviteLink({
  assignmentId,
  partyId,
  nome,
  celular,
  data,
  links,
}: {
  assignmentId: string;
  partyId: string;
  nome: string;
  celular: string | null;
  data: string;
  links: ConviteLinkRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // O token em claro só existe no retorno da action. Guardamos a URL
  // recém-criada aqui e, para sobreviver ao recarregar, no navegador.
  const [urlNova, setUrlNova] = useState<string | null>(null);

  const emAberto = vigente(links);
  const jaTeveLink = links.length > 0;

  // useSyncExternalStore em vez de efeito: o localStorage não existe no
  // servidor, e ler no render puro quebraria a hidratação.
  const idEmAberto = emAberto?.id ?? null;
  const urlSalva = useSyncExternalStore(
    assinarConvites,
    () => lerConvite(idEmAberto),
    () => null,
  );

  const url = urlNova ?? urlSalva;

  function gerar() {
    startTransition(async () => {
      const res = await gerarConvite(assignmentId, partyId);
      if ("error" in res) toast.error(res.error);
      else {
        // O anterior deixou de valer no banco; some do navegador também.
        if (emAberto) esquecerConvite(emAberto.id);
        lembrarConvite(res.linkId, res.url, res.expiraEm);
        setUrlNova(res.url);
        await navigator.clipboard.writeText(res.url).catch(() => {});
        toast.success("Link gerado e copiado. Vale 24 horas.");
        // Sem isso o card seguiria mostrando a validade do link anterior.
        router.refresh();
      }
    });
  }

  function copiar() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  function abrirWhatsApp() {
    if (!url) return;
    const numero = toWhatsAppNumber(celular);
    const texto = encodeURIComponent(
      `Oi, ${nome.split(" ")[0]}! Você foi escalado para a festa do dia ${formatDate(data)}. ` +
        `Confirme por aqui em até 24h: ${url}`,
    );
    window.open(
      numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-2.5">
      <p
        className={cn(
          "flex items-center gap-1.5 text-xs",
          emAberto ? "text-muted-foreground" : "text-laranja",
        )}
      >
        <Clock className="size-3" />
        {emAberto
          ? `Convite enviado · expira ${formatDateTime(emAberto.expira_em!)}`
          : jaTeveLink
            ? "Convite expirado — gere um novo"
            : "Convite ainda não enviado"}
      </p>

      {url && (
        <p className="truncate rounded border border-border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {url}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {url && (
          <>
            <Button size="sm" variant="outline" onClick={copiar}>
              <Copy className="size-3.5" /> Copiar link
            </Button>
            <Button
              size="sm"
              onClick={abrirWhatsApp}
              className="bg-verde font-semibold text-white hover:bg-verde-escuro"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant={url ? "ghost" : "outline"}
          disabled={pending}
          onClick={gerar}
        >
          <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
          {pending ? "Gerando…" : emAberto ? "Gerar novo link" : "Gerar link do convite"}
        </Button>
      </div>

      {emAberto && !url && (
        <p className="text-[11px] text-muted-foreground">
          O link enviado não fica guardado no sistema — só o resumo dele. Gerar um
          novo derruba o que está no WhatsApp do colaborador.
        </p>
      )}
    </div>
  );
}
