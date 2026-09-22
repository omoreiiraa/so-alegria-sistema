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
import {
  aprovarColaborador,
  definirNomeTio,
  definirAtivo,
} from "@/actions/colaboradores";

/**
 * Aprovar não escolhe função nenhuma: a mesma pessoa vai como coordenadora numa
 * festa e experiente na outra, então isso é decidido na escalação (ADR-0026).
 * Aqui sobra o que é da pessoa, não da festa: liberar o cadastro, o nome de tio
 * e ativar/desativar.
 */
export function ColaboradorActions({
  profileId,
  aprovado,
  ativo,
  nomeTio,
}: {
  profileId: string;
  aprovado: boolean;
  ativo: boolean;
  nomeTio: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState(nomeTio ?? "");

  function salvar() {
    startTransition(async () => {
      let err: string | undefined;
      if (!aprovado) {
        err = (await aprovarColaborador(profileId)).error;
      }
      if (!err && nome.trim() !== (nomeTio ?? "")) {
        err = (await definirNomeTio(profileId, nome)).error;
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
      const res = await definirAtivo(profileId, !ativo);
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
            {aprovado
              ? "O nome de tio é o que aparece para o cliente nas festas."
              : "Aprovar libera a pessoa para ser escalada. A função e o cachê são escolhidos em cada festa, na hora de escalar."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="nome_tio">Nome de tio (opcional)</Label>
          <Input
            id="nome_tio"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Tio Léo"
          />
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
