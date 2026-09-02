"use client";

import { useState } from "react";
import { ListFilter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type OpcaoCategoria = { valor: string; total: number };

/**
 * Botão de filtro por categoria, com a lista em popover. Valor "" é a opção
 * "Sem categoria"; `null` no `filtro` significa todas.
 */
export function FiltroCategorias({
  opcoes,
  total,
  filtro,
  onChange,
}: {
  opcoes: OpcaoCategoria[];
  /** Quantos itens a opção "Todas" representa. */
  total: number;
  filtro: string | null;
  onChange: (valor: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);

  function escolher(valor: string | null) {
    onChange(valor);
    setAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        aria-label="Filtrar por categoria"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
          filtro !== null
            ? "border-verde bg-verde/10 text-verde-escuro"
            : "border-input text-muted-foreground hover:bg-muted",
        )}
      >
        <ListFilter className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-80 w-60 gap-0 overflow-y-auto p-1">
        <Opcao ativo={filtro === null} total={total} onClick={() => escolher(null)}>
          Todas as categorias
        </Opcao>
        {opcoes.map((o) => (
          <Opcao
            key={o.valor || "sem"}
            ativo={filtro === o.valor}
            total={o.total}
            onClick={() => escolher(o.valor)}
          >
            {o.valor || "Sem categoria"}
          </Opcao>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Opcao({
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
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        ativo ? "bg-verde/10 font-medium text-verde-escuro" : "hover:bg-muted",
        total === 0 && !ativo && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      <span className="truncate">{children}</span>
      <span className={cn("shrink-0 tabular-nums", ativo ? "text-verde-escuro/70" : "text-muted-foreground")}>
        {total}
      </span>
    </button>
  );
}
