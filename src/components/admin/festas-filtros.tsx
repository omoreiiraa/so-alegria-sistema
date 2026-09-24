"use client";

import { useState } from "react";
import { ListFilter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Chip } from "@/components/common/filtros";
import { cn } from "@/lib/utils";

export type FiltrosFestas = {
  ano: number | null;
  /** 1–12; só vale junto com `ano`. */
  mes: number | null;
  /** Período livre, YYYY-MM-DD. Vazio = sem limite. */
  de: string;
  ate: string;
  tipo: string | null;
  soViagem: boolean;
};

export const FILTROS_VAZIOS: FiltrosFestas = {
  ano: null,
  mes: null,
  de: "",
  ate: "",
  tipo: null,
  soViagem: false,
};

/** Quantos filtros estão mexendo no resultado. */
export function contarFiltros(f: FiltrosFestas): number {
  return (
    (f.ano !== null ? 1 : 0) +
    (f.mes !== null ? 1 : 0) +
    (f.de || f.ate ? 1 : 0) +
    (f.tipo !== null ? 1 : 0) +
    (f.soViagem ? 1 : 0)
  );
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function FestasFiltros({
  filtros,
  onChange,
  anos,
  tipos,
}: {
  filtros: FiltrosFestas;
  onChange: (f: FiltrosFestas) => void;
  /** Anos que têm festa, do mais recente para o mais antigo. */
  anos: number[];
  tipos: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const ativos = contarFiltros(filtros);
  const set = (parcial: Partial<FiltrosFestas>) => onChange({ ...filtros, ...parcial });

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger
        className={cn(
          "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
          ativos > 0
            ? "border-verde bg-verde/10 text-verde-escuro"
            : "border-input text-muted-foreground hover:bg-muted",
        )}
      >
        <ListFilter className="size-4" />
        Filtros
        {ativos > 0 && (
          <span className="rounded-full bg-verde px-1.5 text-xs font-semibold text-white tabular-nums">
            {ativos}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-4 p-3">
        <Grupo titulo="Ano">
          <Chip ativo={filtros.ano === null} onClick={() => set({ ano: null, mes: null })}>
            Todos
          </Chip>
          {anos.map((a) => (
            <Chip key={a} ativo={filtros.ano === a} onClick={() => set({ ano: a })}>
              {a}
            </Chip>
          ))}
        </Grupo>

        {filtros.ano !== null && (
          <Grupo titulo={`Mês de ${filtros.ano}`}>
            <Chip ativo={filtros.mes === null} onClick={() => set({ mes: null })}>
              Todos
            </Chip>
            {MESES.map((m, i) => (
              <Chip key={m} ativo={filtros.mes === i + 1} onClick={() => set({ mes: i + 1 })}>
                {m}
              </Chip>
            ))}
          </Grupo>
        )}

        <Grupo titulo="Período da festa">
          <div className="grid w-full grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              De
              <Input type="date" value={filtros.de} onChange={(e) => set({ de: e.target.value })} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Até
              <Input type="date" value={filtros.ate} onChange={(e) => set({ ate: e.target.value })} />
            </label>
          </div>
        </Grupo>

        {tipos.length > 0 && (
          <Grupo titulo="Tipo de festa">
            <Chip ativo={filtros.tipo === null} onClick={() => set({ tipo: null })}>
              Todos
            </Chip>
            {tipos.map((t) => (
              <Chip key={t} ativo={filtros.tipo === t} onClick={() => set({ tipo: t })}>
                {t}
              </Chip>
            ))}
          </Grupo>
        )}

        <Grupo titulo="Outros">
          <Chip ativo={filtros.soViagem} onClick={() => set({ soViagem: !filtros.soViagem })}>
            Só viagens
          </Chip>
        </Grupo>

        {ativos > 0 && (
          <button
            type="button"
            onClick={() => onChange(FILTROS_VAZIOS)}
            className="flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" /> Limpar filtros
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
