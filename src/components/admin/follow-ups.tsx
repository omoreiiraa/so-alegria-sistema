"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SendHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils/date";
import { adicionarFollowUp, excluirFollowUp } from "@/actions/follow-ups";

export type FollowUp = {
  id: string;
  texto: string;
  autor: string;
  criadoEm: string;
  /** Quem está logado pode apagar este registro (é o autor, ou é da gestão). */
  podeApagar: boolean;
};

/**
 * Anotações de contato com o cliente, da mais nova para a mais antiga. Cmd/Ctrl
 * + Enter envia; Enter sozinho quebra linha, para não mandar pela metade.
 */
export function FollowUps({ festaId, itens }: { festaId: string; itens: FollowUp[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, startEnvio] = useTransition();
  const [apagando, setApagando] = useState<string | null>(null);

  function enviar() {
    if (!texto.trim() || enviando) return;
    startEnvio(async () => {
      const res = await adicionarFollowUp(festaId, texto);
      if (res?.error) toast.error(res.error);
      else {
        setTexto("");
        router.refresh();
      }
    });
  }

  async function apagar(id: string) {
    setApagando(id);
    const res = await excluirFollowUp(id, festaId);
    setApagando(null);
    if (res?.error) toast.error(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              enviar();
            }
          }}
          maxLength={2000}
          rows={2}
          placeholder="Adicionar novo follow-up…"
          aria-label="Novo follow-up"
          className="min-h-16"
        />
        <Button
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          size="icon"
          aria-label="Salvar follow-up"
          className="size-11 shrink-0 bg-verde text-white hover:bg-verde-escuro"
        >
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
        </Button>
      </div>

      {itens.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          Nenhum follow-up registrado ainda.
        </p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {itens.map((f) => (
            <li key={f.id} className="group rounded-lg bg-muted px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate font-medium">{f.autor}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {formatDateTime(f.criadoEm)}
                  {f.podeApagar && (
                    <button
                      type="button"
                      onClick={() => apagar(f.id)}
                      disabled={apagando === f.id}
                      aria-label="Apagar follow-up"
                      className="rounded p-0.5 opacity-0 transition-opacity hover:text-vermelho focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-foreground">{f.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
