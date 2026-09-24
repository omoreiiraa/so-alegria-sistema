"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { marcarPerdido } from "@/actions/festas";
import { MOTIVOS_PERDA, MOTIVO_PERDA_LABEL, type MotivoPerda } from "@/types/domain";

/**
 * Pergunta o motivo e manda a festa para Perdidos (status `cancelada`). É o
 * mesmo diálogo no "Cancelar festa" e na página Perdidos: todo cliente perdido
 * sai com motivo, e é esse motivo que orienta a tentativa de recuperação.
 */
export function MarcarPerdidoDialog({
  festaId,
  cliente,
  motivoInicial,
  open,
  onOpenChange,
}: {
  festaId: string;
  cliente: string | null;
  motivoInicial?: MotivoPerda;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [motivo, setMotivo] = useState<MotivoPerda | null>(motivoInicial ?? null);
  const [obs, setObs] = useState("");

  function salvar() {
    if (!motivo) return;
    startTransition(async () => {
      const res = await marcarPerdido(festaId, motivo, obs);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Cliente movido para Perdidos.");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como perdido</DialogTitle>
          <DialogDescription>
            {cliente ? `Por que ${cliente} não seguiu com a festa?` : "Por que o cliente não seguiu com a festa?"}{" "}
            O cliente fica na página Perdidos para uma nova tentativa depois.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {MOTIVOS_PERDA.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMotivo(m)}
              aria-pressed={motivo === m}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                motivo === m
                  ? "border-vermelho bg-vermelho text-white"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {MOTIVO_PERDA_LABEL[m]}
            </button>
          ))}
        </div>
        <Textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          maxLength={500}
          placeholder={motivo === "outro" ? "Conte o motivo (obrigatório)" : "Detalhes (opcional)"}
          rows={3}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Voltar
          </Button>
          <Button
            onClick={salvar}
            disabled={pending || !motivo || (motivo === "outro" && !obs.trim())}
            className="bg-vermelho font-semibold text-white hover:bg-vermelho/90"
          >
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
