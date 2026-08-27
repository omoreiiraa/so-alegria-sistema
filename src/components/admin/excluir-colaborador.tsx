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
  DialogTrigger,
} from "@/components/ui/dialog";
import { excluirColaborador } from "@/actions/colaboradores";

/**
 * Exclusão definitiva da ficha. Quem barra o caso perigoso é o banco: se o
 * colaborador já tem festa ou pagamento, a RPC recusa e devolve o motivo.
 */
export function ExcluirColaborador({
  profileId,
  nome,
}: {
  profileId: string;
  nome: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function excluir() {
    startTransition(async () => {
      const res = await excluirColaborador(profileId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`${nome} foi excluído.`);
      setOpen(false);
      router.replace("/admin/colaboradores");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="icon"
            variant="ghost"
            aria-label="Excluir colaborador"
            className="text-vermelho hover:bg-vermelho/10 hover:text-vermelho"
          />
        }
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {nome}?</DialogTitle>
          <DialogDescription>
            A ficha e os links de cadastro somem para sempre — não dá para desfazer.
            Se o colaborador já foi escalado ou recebeu pagamento, a exclusão é
            bloqueada; nesse caso, desative em vez de excluir.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={excluir}
            className="bg-vermelho font-semibold text-white hover:bg-vermelho/90"
          >
            {pending ? "Excluindo…" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
