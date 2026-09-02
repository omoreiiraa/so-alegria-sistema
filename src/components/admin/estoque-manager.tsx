"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Package, Pencil, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/image";
import { criarItem, atualizarItem, removerItem } from "@/actions/estoque";

export type ItemEstoque = {
  id: string;
  nome: string;
  categoria: string | null;
  quantidade_total: number;
  emUso: number;
  disponivel: number;
  fotoPath: string | null;
  fotoUrl: string | null;
};

export function EstoqueManager({ itens }: { itens: ItemEstoque[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function novo() {
    setEditId(null);
    setNome("");
    setCategoria("");
    setQuantidade("");
    setFotoPath(null);
    setPreview(null);
    setOpen(true);
  }

  function editar(i: ItemEstoque) {
    setEditId(i.id);
    setNome(i.nome);
    setCategoria(i.categoria ?? "");
    setQuantidade(String(i.quantidade_total));
    setFotoPath(i.fotoPath);
    setPreview(i.fotoUrl);
    setOpen(true);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("estoque")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) {
        toast.error("Não foi possível enviar a foto.");
      } else {
        setFotoPath(path);
        setPreview(URL.createObjectURL(blob));
      }
    } catch {
      toast.error("Não foi possível processar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  function salvar() {
    startTransition(async () => {
      const payload = {
        nome,
        categoria,
        quantidade_total: quantidade ? Number(quantidade) : 0,
        foto_url: fotoPath ?? "",
      };
      const res = editId ? await atualizarItem(editId, payload) : await criarItem(payload);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(editId ? "Item atualizado." : "Item cadastrado.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  function remover() {
    if (!editId) return;
    startTransition(async () => {
      const res = await removerItem(editId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(
          res.apagado
            ? "Item apagado do estoque."
            : "Item removido e zerado. O histórico de movimentações foi mantido.",
        );
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={novo} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
          <Plus className="size-4" /> Novo item
        </Button>
      </div>

      {itens.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="Estoque vazio"
          description="Cadastre materiais (com foto) para levar às festas e controlar a devolução."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(17rem,100%),1fr))] gap-3">
          {itens.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex items-stretch gap-3 p-4">
                <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {i.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.fotoUrl} alt={i.nome} className="size-full object-cover" />
                  ) : (
                    <Package className="size-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-medium leading-snug break-words">{i.nome}</p>
                      {i.categoria && (
                        <p className="truncate text-xs text-muted-foreground">{i.categoria}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => editar(i)}
                      aria-label={`Editar ${i.nome}`}
                      className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="whitespace-nowrap font-semibold text-verde-escuro">
                      {i.disponivel} disp.
                    </span>
                    <span className="whitespace-nowrap">{i.emUso} em uso</span>
                    <span className="whitespace-nowrap">{i.quantidade_total} total</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border p-3 text-left hover:bg-muted"
            >
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="size-16 object-cover" />
                ) : (
                  <ImagePlus className="size-6 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {uploading ? "Enviando…" : preview ? "Trocar foto" : "Adicionar foto"}
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Caixa de som" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Som, brinquedo…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd">Quantidade total</Label>
                <Input id="qtd" type="number" inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {editId ? (
              <Button variant="ghost" onClick={remover} disabled={pending} className="text-vermelho hover:text-vermelho">
                Remover
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={salvar} disabled={pending || uploading || !nome.trim()} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
