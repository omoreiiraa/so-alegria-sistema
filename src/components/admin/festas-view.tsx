"use client";

import { useState } from "react";
import Link from "next/link";
import { ptBR } from "date-fns/locale";
import { LayoutGrid, CalendarDays, Plane, Users, MapPin, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import { fromISODate, toISODateLocal, formatDate, formatTime } from "@/lib/utils/date";
import { PARTY_STATUS_LABEL } from "@/types/domain";
import type { PartyStatus } from "@/types/domain";

export type FestaCard = {
  id: string;
  status: PartyStatus;
  data: string;
  horaInicio: string;
  horaFim: string;
  isViagem: boolean;
  contratante: string | null;
  tipo: string | null;
  local: string;
  total: number;
  confirmados: number;
};

const COLUNAS: { status: PartyStatus; dot: string }[] = [
  { status: "orcamento", dot: "border border-dashed border-muted-foreground bg-transparent" },
  { status: "fechada", dot: "bg-muted-foreground/40" },
  { status: "escalada", dot: "bg-laranja" },
  { status: "confirmada", dot: "bg-verde" },
  { status: "realizada", dot: "bg-verde-escuro" },
  { status: "paga", dot: "bg-amarelo" },
];

export function FestasView({ festas }: { festas: FestaCard[] }) {
  const [view, setView] = useState<"kanban" | "calendario">("kanban");
  const [dia, setDia] = useState<Date | undefined>(undefined);

  const canceladas = festas.filter((f) => f.status === "cancelada");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        <ToggleBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={<LayoutGrid className="size-4" />}>
          Kanban
        </ToggleBtn>
        <ToggleBtn active={view === "calendario"} onClick={() => setView("calendario")} icon={<CalendarDays className="size-4" />}>
          Calendário
        </ToggleBtn>
      </div>

      {festas.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="size-6" />}
          title="Nenhuma festa cadastrada"
          description="Clique em “Nova festa” para começar a montar a operação."
        />
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUNAS.map((col) => {
            const itens = festas.filter((f) => f.status === col.status);
            // Colunas dividem a largura disponível e só entram em scroll
            // horizontal quando não cabem no mínimo de 16rem.
            return (
              <div key={col.status} className="min-w-64 flex-1">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={cn("size-2 rounded-full", col.dot)} />
                  <h3 className="text-sm font-semibold">{PARTY_STATUS_LABEL[col.status]}</h3>
                  <span className="text-xs text-muted-foreground">{itens.length}</span>
                </div>
                <div className="space-y-2">
                  {itens.map((f) => (
                    <FestaMiniCard key={f.id} f={f} />
                  ))}
                  {itens.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      Vazio
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
          <Calendar
            mode="single"
            selected={dia}
            onSelect={setDia}
            locale={ptBR}
            showOutsideDays={false}
            modifiers={{ temFesta: festas.map((f) => fromISODate(f.data)) }}
            modifiersClassNames={{
              temFesta: "relative font-bold text-verde-escuro",
            }}
            className="rounded-xl border border-border bg-card"
          />
          <div>
            {(() => {
              const alvo = dia ? toISODateLocal(dia) : null;
              const doDia = alvo ? festas.filter((f) => f.data === alvo) : [];
              if (!alvo)
                return (
                  <p className="px-1 py-8 text-center text-sm text-muted-foreground">
                    Selecione um dia para ver as festas.
                  </p>
                );
              if (doDia.length === 0)
                return (
                  <p className="px-1 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma festa em {formatDate(alvo)}.
                  </p>
                );
              return (
                <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                  {doDia.map((f) => (
                    <FestaMiniCard key={f.id} f={f} />
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {canceladas.length > 0 && view === "kanban" && (
        <details className="rounded-lg border border-border bg-card px-4 py-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Canceladas ({canceladas.length})
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {canceladas.map((f) => (
              <FestaMiniCard key={f.id} f={f} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function FestaMiniCard({ f }: { f: FestaCard }) {
  return (
    <Link
      href={`/admin/festas/${f.id}`}
      className="block rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-sm font-bold leading-tight">
          {f.tipo ?? "Festa"}
        </h4>
        {f.isViagem && (
          <Badge variant="secondary" className="gap-1 bg-amarelo/15 text-foreground">
            <Plane className="size-3" /> Viagem
          </Badge>
        )}
      </div>
      {f.contratante && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.contratante}</p>
      )}
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Clock className="size-3" />
          {formatDate(f.data)} · {formatTime(f.horaInicio)}–{formatTime(f.horaFim)}
        </p>
        {f.local && (
          <p className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3" /> {f.local}
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <Users className="size-3" /> {f.confirmados}/{f.total} confirmados
        </p>
      </div>
    </Link>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-verde text-white" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
