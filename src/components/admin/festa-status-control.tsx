"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { mudarStatusFesta, excluirFesta } from "@/actions/festas";
import { PARTY_STATUS_LABEL } from "@/types/domain";
import type { PartyStatus } from "@/types/domain";

const PIPELINE: PartyStatus[] = [
  "orcamento",
  "fechada",
  "escalada",
  "confirmada",
  "realizada",
  "paga",
];

export function FestaStatusControl({
  festaId,
  status,
}: {
  festaId: string;
  status: PartyStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function mudar(s: PartyStatus) {
    if (s === status) return;
    startTransition(async () => {
      const res = await mudarStatusFesta(festaId, s);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(`Status: ${PARTY_STATUS_LABEL[s]}`);
        router.refresh();
      }
    });
  }

  function excluir() {
    startTransition(async () => {
      const res = await excluirFesta(festaId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Festa excluída.");
        router.push("/admin/festas");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PIPELINE.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => mudar(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              s === status
                ? "border-verde bg-verde text-white"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {PARTY_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {status !== "cancelada" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => mudar("cancelada")}
            className="text-xs font-medium text-muted-foreground hover:text-vermelho"
          >
            Cancelar festa
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-vermelho"
        >
          <Trash2 className="size-3" /> Excluir
        </button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir festa?</DialogTitle>
            <DialogDescription>
              Esta ação remove a festa e todos os convites ligados a ela. Não dá
              para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Voltar
            </Button>
            <Button
              onClick={excluir}
              disabled={pending}
              className="bg-vermelho font-semibold text-white hover:bg-vermelho/90"
            >
              Excluir festa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
