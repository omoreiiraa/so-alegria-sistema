"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  vincularMaterial,
  removerMaterial,
  registrarDevolucao,
} from "@/actions/estoque";

export type Material = {
  id: string;
  nome: string;
  qtdLevada: number;
  qtdDevolvida: number | null;
  qtdPerdida: number;
};

export function MateriaisFesta({
  partyId,
  realizada,
  materiais,
  itens,
}: {
  partyId: string;
  realizada: boolean;
  materiais: Material[];
  itens: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sel, setSel] = useState("");
  const [qtd, setQtd] = useState("");

  const disponiveis = itens.filter((i) => !materiais.some((m) => m.nome === i.nome));

  function adicionar() {
    if (!sel || !qtd) return;
    startTransition(async () => {
      const res = await vincularMaterial(partyId, sel, Number(qtd));
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Material adicionado.");
        setSel("");
        setQtd("");
        router.refresh();
      }
    });
  }

  function remover(id: string) {
    startTransition(async () => {
      const res = await removerMaterial(id, partyId);
      if (res?.error) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {materiais.length === 0 && !realizada && (
        <p className="text-sm text-muted-foreground">Nenhum material vinculado ainda.</p>
      )}

      {materiais.map((m) => (
        <div key={m.id} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{m.nome}</p>
              <p className="text-xs text-muted-foreground">Levados: {m.qtdLevada}</p>
            </div>
            {m.qtdDevolvida != null ? (
              <Badge className="bg-verde/15 text-verde-escuro">
                Devolvido {m.qtdDevolvida}
                {m.qtdPerdida > 0 ? ` · perda ${m.qtdPerdida}` : ""}
              </Badge>
            ) : realizada ? null : (
              <button
                type="button"
                onClick={() => remover(m.id)}
                disabled={pending}
                aria-label="Remover"
                className="text-muted-foreground hover:text-vermelho"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {realizada && m.qtdDevolvida == null && (
            <DevolucaoRow material={m} partyId={partyId} />
          )}
        </div>
      ))}

      {!realizada && disponiveis.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <Label>Adicionar material</Label>
          <div className="flex flex-wrap gap-1.5">
            {disponiveis.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setSel(i.id === sel ? "" : i.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  sel === i.id ? "border-verde bg-verde/10 text-verde-escuro" : "border-border hover:bg-muted",
                )}
              >
                {i.nome}
              </button>
            ))}
          </div>
          {sel && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="qtd-mat" className="text-xs">Quantidade</Label>
                <Input id="qtd-mat" type="number" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
              </div>
              <Button onClick={adicionar} disabled={pending || !qtd} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DevolucaoRow({ material, partyId }: { material: Material; partyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [devolvida, setDevolvida] = useState(String(material.qtdLevada));
  const [perdida, setPerdida] = useState("0");

  function registrar() {
    startTransition(async () => {
      const res = await registrarDevolucao(
        material.id,
        partyId,
        Number(devolvida || 0),
        Number(perdida || 0),
      );
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Devolução registrada.");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
      <div className="flex-1 space-y-1">
        <Label className="text-xs">Devolvidos</Label>
        <Input type="number" inputMode="numeric" value={devolvida} onChange={(e) => setDevolvida(e.target.value)} />
      </div>
      <div className="flex-1 space-y-1">
        <Label className="text-xs">Perdidos</Label>
        <Input type="number" inputMode="numeric" value={perdida} onChange={(e) => setPerdida(e.target.value)} />
      </div>
      <Button onClick={registrar} disabled={pending} variant="outline" className="font-semibold">
        <Check className="size-4" /> Conferir
      </Button>
    </div>
  );
}
