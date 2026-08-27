"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Copy, MessageCircle } from "lucide-react";
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
import { criarColaborador } from "@/actions/links";
import { formatPhoneBR, toWhatsAppNumber } from "@/lib/utils/phone";

export function NovoColaborador() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  // O token em claro só existe neste retorno — depois de fechar, só gerando outro.
  const [url, setUrl] = useState<string | null>(null);

  function criar() {
    startTransition(async () => {
      const res = await criarColaborador({ nome_completo: nome, celular });
      if ("error" in res && res.error) toast.error(res.error);
      else if ("url" in res && res.url) {
        setUrl(res.url);
        await navigator.clipboard.writeText(res.url).catch(() => {});
        toast.success("Colaborador criado. Link copiado!");
        router.refresh();
      }
    });
  }

  function abrirWhatsApp() {
    if (!url) return;
    const numero = toWhatsAppNumber(celular);
    const texto = encodeURIComponent(
      `Oi, ${nome.split(" ")[0]}! Bem-vindo(a) à equipe da Só Alegria. ` +
        `Preencha seu cadastro por aqui: ${url}`,
    );
    window.open(
      numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function fechar() {
    setOpen(false);
    setNome("");
    setCelular("");
    setUrl(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : fechar())}>
      <DialogTrigger
        render={
          <Button className="bg-verde font-semibold text-white hover:bg-verde-escuro" />
        }
      >
        <UserPlus className="size-4" /> Novo colaborador
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {url ? "Link de cadastro" : "Novo colaborador"}
          </DialogTitle>
          <DialogDescription>
            {url
              ? "Envie o link para o colaborador preencher os próprios dados. Ele vale até ser usado."
              : "O colaborador preenche o resto dos dados pelo link que você vai enviar."}
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="space-y-3">
            <p className="break-all rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs">
              {url}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success("Link copiado.");
                }}
              >
                <Copy className="size-4" /> Copiar
              </Button>
              <Button
                className="flex-1 bg-verde font-semibold text-white hover:bg-verde-escuro"
                onClick={abrirWhatsApp}
              >
                <MessageCircle className="size-4" /> WhatsApp
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Maria Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular">Celular (WhatsApp)</Label>
              <Input
                id="celular"
                type="tel"
                inputMode="numeric"
                value={celular}
                onChange={(e) => setCelular(formatPhoneBR(e.target.value))}
                placeholder="(11) 90000-0000"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {url ? (
            <Button onClick={fechar} variant="outline" className="font-semibold">
              Concluir
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={fechar} disabled={pending}>
                Cancelar
              </Button>
              <Button
                onClick={criar}
                disabled={pending || nome.trim().length < 3}
                className="bg-verde font-semibold text-white hover:bg-verde-escuro"
              >
                {pending ? "Criando…" : "Criar e gerar link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
