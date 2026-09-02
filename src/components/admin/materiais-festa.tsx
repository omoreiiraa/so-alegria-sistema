"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Plus, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { normalizarTexto } from "@/lib/utils/texto";
import { FiltroCategorias } from "@/components/admin/filtro-categorias";
import { CATEGORIAS_ESTOQUE, eCategoriaEstoque } from "@/types/domain";
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
  itens: { id: string; nome: string; categoria: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sel, setSel] = useState("");
  const [qtd, setQtd] = useState("");
  /** null = todas; "" = itens sem categoria. */
  const [filtro, setFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const disponiveis = useMemo(
    () => itens.filter((i) => !materiais.some((m) => m.nome === i.nome)),
    [itens, materiais],
  );

  const termo = normalizarTexto(busca);
  const porBusca = useMemo(
    () => (termo ? disponiveis.filter((i) => normalizarTexto(i.nome).includes(termo)) : disponiveis),
    [disponiveis, termo],
  );

  const contagem = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of porBusca) {
      const c = (i.categoria ?? "").trim();
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [porBusca]);

  /** Só as categorias que têm material para levar — aqui a lista fechada seria ruído. */
  const categorias = useMemo(() => {
    const presentes = new Set(disponiveis.map((i) => (i.categoria ?? "").trim()));
    const ordenadas: string[] = [
      ...CATEGORIAS_ESTOQUE.filter((c) => presentes.has(c)),
      ...[...presentes].filter((c) => c !== "" && !eCategoriaEstoque(c)).sort(),
    ];
    if (presentes.has("")) ordenadas.push("");
    return ordenadas;
  }, [disponiveis]);

  const listagem = useMemo(
    () =>
      filtro === null ? porBusca : porBusca.filter((i) => (i.categoria ?? "").trim() === filtro),
    [porBusca, filtro],
  );

  const selecionado = itens.find((i) => i.id === sel);

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

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar material…"
                aria-label="Buscar material pelo nome"
                className="pl-8"
              />
            </div>
            {categorias.length > 1 && (
              <FiltroCategorias
                opcoes={categorias.map((c) => ({ valor: c, total: contagem.get(c) ?? 0 }))}
                total={porBusca.length}
                filtro={filtro}
                onChange={setFiltro}
              />
            )}
          </div>

          {filtro !== null && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>
                Filtrando por{" "}
                <span className="font-medium text-verde-escuro">{filtro || "Sem categoria"}</span>
              </span>
              <button
                type="button"
                onClick={() => setFiltro(null)}
                aria-label="Limpar filtro de categoria"
                className="hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          {listagem.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Nenhum material encontrado.
            </p>
          ) : (
            <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
              {listagem.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setSel(i.id === sel ? "" : i.id)}
                  className={cn(
                    "h-fit rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    sel === i.id ? "border-verde bg-verde/10 text-verde-escuro" : "border-border hover:bg-muted",
                  )}
                >
                  {i.nome}
                </button>
              ))}
            </div>
          )}

          {sel && (
            <div className="flex items-end gap-2 border-t border-border pt-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="qtd-mat" className="text-xs">
                  Quantidade {selecionado ? `de ${selecionado.nome}` : ""}
                </Label>
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
