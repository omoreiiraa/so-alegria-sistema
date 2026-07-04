"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { removerEscalado } from "@/actions/festas";

export function RemoverEscalado({
  assignmentId,
  partyId,
}: {
  assignmentId: string;
  partyId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Remover da escala"
      onClick={() =>
        startTransition(async () => {
          const res = await removerEscalado(assignmentId, partyId);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Removido da escala.");
            router.refresh();
          }
        })
      }
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-vermelho/10 hover:text-vermelho disabled:opacity-40"
    >
      <X className="size-4" />
    </button>
  );
}
