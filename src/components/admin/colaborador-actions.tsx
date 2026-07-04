"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CARGO_LABEL, CARGO_BASE } from "@/types/domain";
import type { CargoType } from "@/types/domain";
import { formatBRL } from "@/lib/utils/money";
import {
  aprovarColaborador,
  definirCargo,
  definirNomeTio,
  definirAtivo,
} from "@/actions/colaboradores";

const CARGOS: CargoType[] = ["trainee", "junior", "experiente", "coordenador"];

export function ColaboradorActions({
  userId,
  aprovado,
  ativo,
  cargo,
  nomeTio,
}: {
  userId: string;
  aprovado: boolean;
  ativo: boolean;
  cargo: CargoType;
  nomeTio: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sel, setSel] = useState<CargoType | null>(
    cargo === "pendente" ? null : cargo,
  );
  const [nome, setNome] = useState(nomeTio ?? "");

  function salvar() {
    if (!sel) {
      toast.error("Escolha um cargo.");
      return;
    }
    startTransition(async () => {
      let err: string | undefined;
      if (!aprovado) {
        err = (await aprovarColaborador(userId, sel)).error;
      } else if (sel !== cargo) {
        err = (await definirCargo(userId, sel)).error;
      }
      if (!err && nome.trim() !== (nomeTio ?? "")) {
        err = (await definirNomeTio(userId, nome)).error;
      }
      if (err) toast.error(err);
      else {
        toast.success(aprovado ? "Colaborador atualizado." : "Colaborador aprovado! 🎉");
        setOpen(false);
      }
    });
  }

  function toggleAtivo() {
    startTransition(async () => {
      const res = await definirAtivo(userId, !ativo);
      if (res.error) toast.error(res.error);
      else {
        toast.success(ativo ? "Colaborador desativado." : "Colaborador reativado.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={aprovado ? "outline" : "default"}
            className={cn(
              "font-semibold",
              !aprovado && "bg-verde text-white hover:bg-verde-escuro",
            )}
          />
        }
      >
        {aprovado ? "Gerenciar" : "Aprovar"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {aprovado ? "Gerenciar colaborador" : "Aprovar colaborador"}
          </DialogTitle>
          <DialogDescription>
            Defina o cargo e o nome de tio usado nas festas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cargo</Label>
            <div className="grid grid-cols-2 gap-2">
              {CARGOS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSel(c)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    sel === c
                      ? "border-verde bg-verde/10 text-verde-escuro"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span className="block font-semibold">{CARGO_LABEL[c]}</span>
                  <span className="text-xs text-muted-foreground">
                    base {formatBRL(CARGO_BASE[c] ?? 0)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_tio">Nome de tio</Label>
            <Input
              id="nome_tio"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Tio Léo"
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {aprovado ? (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={toggleAtivo}
              className={ativo ? "text-vermelho hover:text-vermelho" : ""}
            >
              {ativo ? "Desativar" : "Reativar"}
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            onClick={salvar}
            disabled={pending}
            className="bg-verde font-semibold text-white hover:bg-verde-escuro"
          >
            {aprovado ? "Salvar" : "Aprovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
