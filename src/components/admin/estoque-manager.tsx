"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Package, Pencil, ImagePlus, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import { CATEGORIAS_ESTOQUE, eCategoriaEstoque } from "@/types/domain";
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
  /** null = todas; "" = itens sem categoria. */
  const [filtro, setFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const termo = normalizar(busca);
  const porBusca = useMemo(
    () => (termo ? itens.filter((i) => normalizar(i.nome).includes(termo)) : itens),
    [itens, termo],
  );

  // As contagens seguem a busca, para o chip dizer quantos há de fato na tela.
  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of porBusca) {
      const c = (i.categoria ?? "").trim();
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [porBusca]);

  /** Categorias gravadas antes da lista fechada — seguem filtráveis. */
  const antigas = useMemo(
    () =>
      [...new Set(itens.map((i) => (i.categoria ?? "").trim()))]
        .filter((c) => c !== "" && !eCategoriaEstoque(c))
        .sort(),
    [itens],
  );

  const visiveis = useMemo(
    () =>
      filtro === null ? porBusca : porBusca.filter((i) => (i.categoria ?? "").trim() === filtro),
    [porBusca, filtro],
  );

  /** Mantém a categoria atual do item na lista, mesmo fora da taxonomia. */
  const opcoesCategoria = useMemo(
    () =>
      categoria && !eCategoriaEstoque(categoria)
        ? [...CATEGORIAS_ESTOQUE, categoria]
        : [...CATEGORIAS_ESTOQUE],
    [categoria],
  );

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
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item pelo nome…"
            aria-label="Buscar item pelo nome"
            className="pl-9"
          />
        </div>
        <Button onClick={novo} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
          <Plus className="size-4" /> Novo item
        </Button>
      </div>

      {itens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip ativo={filtro === null} total={porBusca.length} onClick={() => setFiltro(null)}>
            Todas
          </Chip>
          {CATEGORIAS_ESTOQUE.map((c) => (
            <Chip
              key={c}
              ativo={filtro === c}
              total={contagem.get(c) ?? 0}
              onClick={() => setFiltro(c)}
            >
              {c}
            </Chip>
          ))}
          {antigas.map((c) => (
            <Chip key={c} ativo={filtro === c} total={contagem.get(c) ?? 0} onClick={() => setFiltro(c)}>
              {c}
            </Chip>
          ))}
          {itens.some((i) => !(i.categoria ?? "").trim()) && (
            <Chip ativo={filtro === ""} total={contagem.get("") ?? 0} onClick={() => setFiltro("")}>
              Sem categoria
            </Chip>
          )}
        </div>
      )}

      {itens.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="Estoque vazio"
          description="Cadastre materiais (com foto) para levar às festas e controlar a devolução."
        />
      ) : visiveis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
          <Button
            variant="ghost"
            onClick={() => {
              setBusca("");
              setFiltro(null);
            }}
            className="mt-2"
          >
            Limpar busca e filtro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(17rem,100%),1fr))] gap-3">
          {visiveis.map((i) => (
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
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(String(v ?? ""))}>
                  <SelectTrigger id="categoria" className="w-full">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {opcoesCategoria.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

function Chip({
  ativo,
  total,
  onClick,
  children,
}: {
  ativo: boolean;
  total: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={total === 0 && !ativo}
      aria-pressed={ativo}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        ativo ? "border-verde bg-verde/10 text-verde-escuro" : "border-border hover:bg-muted",
        total === 0 && !ativo && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {children}
      <span className={cn("tabular-nums", ativo ? "text-verde-escuro/70" : "text-muted-foreground")}>
        {total}
      </span>
    </button>
  );
}

/** Busca sem acento e sem caixa: "chapeu" acha "CHAPÉU". */
function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
