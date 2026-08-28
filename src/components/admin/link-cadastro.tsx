"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, MessageCircle, RefreshCw, Ban, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { gerarLinkCadastro, revogarLink } from "@/actions/links";
import { toWhatsAppNumber } from "@/lib/utils/phone";
import { formatDateTime } from "@/lib/utils/date";

export type LinkRow = {
  id: string;
  usado_em: string | null;
  revogado_em: string | null;
  created_at: string;
};

/** O link de cadastro em aberto, se houver: nem usado, nem revogado. */
function emAberto(links: LinkRow[]) {
  return links
    .filter((l) => !l.usado_em && !l.revogado_em)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function LinkCadastro({
  profileId,
  nome,
  celular,
  cadastroPreenchido,
  links,
}: {
  profileId: string;
  /** Nome real do colaborador — vai na mensagem que ele recebe, nunca o nome de tio. */
  nome: string;
  celular: string | null;
  cadastroPreenchido: boolean;
  links: LinkRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmarRevogacao, setConfirmarRevogacao] = useState(false);
  // O token em claro só existe no retorno da action — recarregou, só gerando outro.
  const [url, setUrl] = useState<string | null>(null);

  const aberto = emAberto(links);
  // O cadastro pode ter sido preenchido mais de uma vez; vale a data mais recente.
  const ultimoUso = links
    .map((l) => l.usado_em)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1);

  function gerar() {
    startTransition(async () => {
      const res = await gerarLinkCadastro(profileId);
      if ("error" in res) toast.error(res.error);
      else {
        setUrl(res.url);
        await navigator.clipboard.writeText(res.url).catch(() => {});
        toast.success("Link gerado e copiado.");
        router.refresh();
      }
    });
  }

  function revogar() {
    if (!aberto) return;
    startTransition(async () => {
      const res = await revogarLink(aberto.id);
      if (res?.error) toast.error(res.error);
      else {
        setUrl(null);
        setConfirmarRevogacao(false);
        toast.success("Link revogado. Ele deixa de abrir.");
        router.refresh();
      }
    });
  }

  function abrirWhatsApp() {
    if (!url) return;
    const numero = toWhatsAppNumber(celular);
    const primeiroNome = nome.split(" ")[0];
    const texto = encodeURIComponent(
      cadastroPreenchido
        ? `Oi, ${primeiroNome}! Atualize seus dados cadastrais por aqui: ${url}` +
            " (o formulário já vem preenchido, é só corrigir o que mudou)."
        : `Oi, ${primeiroNome}! Bem-vindo(a) à equipe da Só Alegria. ` +
            `Preencha seu cadastro por aqui: ${url}`,
    );
    window.open(
      numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-sm">
        {cadastroPreenchido ? (
          <>
            <CheckCircle2 className="size-4 text-verde" />
            <span className="text-muted-foreground">
              Cadastro preenchido
              {ultimoUso ? ` em ${formatDateTime(ultimoUso)}` : ""}
            </span>
          </>
        ) : (
          <>
            <Ban className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cadastro ainda não preenchido.</span>
          </>
        )}
      </p>

      <p className="flex items-center gap-1.5 text-sm">
        {aberto ? (
          <>
            <Clock className="size-4 text-laranja" />
            <span className="text-muted-foreground">
              Link {cadastroPreenchido ? "de atualização " : ""}enviado em{" "}
              {formatDateTime(aberto.created_at)} · aguardando resposta
            </span>
          </>
        ) : (
          <>
            <Ban className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Nenhum link em aberto.
              {cadastroPreenchido
                ? " Gere um novo para o colaborador atualizar os próprios dados."
                : " Gere um para enviar."}
            </span>
          </>
        )}
      </p>

      {url && (
        <p className="break-all rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs">
          {url}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {url ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast.success("Link copiado.");
              }}
            >
              <Copy className="size-3.5" /> Copiar
            </Button>
            <Button
              size="sm"
              onClick={abrirWhatsApp}
              className="bg-verde font-semibold text-white hover:bg-verde-escuro"
            >
              <MessageCircle className="size-3.5" /> WhatsApp
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={pending} onClick={gerar}>
            <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
            {aberto
              ? "Gerar novo link"
              : cadastroPreenchido
                ? "Gerar link de atualização"
                : "Gerar link de cadastro"}
          </Button>
        )}

        {aberto && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirmarRevogacao(true)}
            className="text-vermelho hover:text-vermelho"
          >
            <Ban className="size-3.5" /> Revogar
          </Button>
        )}
      </div>

      {aberto && !url && (
        <p className="text-xs text-muted-foreground">
          Gerar um link novo revoga o anterior automaticamente.
        </p>
      )}

      <Dialog open={confirmarRevogacao} onOpenChange={setConfirmarRevogacao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar o link de cadastro?</DialogTitle>
            <DialogDescription>
              Quem abrir o link que já foi enviado verá “link cancelado”. Para o
              colaborador se cadastrar, será preciso gerar e enviar um novo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmarRevogacao(false)}
              disabled={pending}
            >
              Voltar
            </Button>
            <Button
              onClick={revogar}
              disabled={pending}
              className="bg-vermelho font-semibold text-white hover:bg-vermelho/90"
            >
              {pending ? "Revogando…" : "Revogar link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
