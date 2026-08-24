"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import { LayoutGrid, CalendarDays, Plane, Users, MapPin, Clock, GripVertical } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import { fromISODate, toISODateLocal, formatDate, formatTime } from "@/lib/utils/date";
import { mudarStatusFesta } from "@/actions/festas";
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
  const router = useRouter();
  const [view, setView] = useState<"kanban" | "calendario">("kanban");
  const [dia, setDia] = useState<Date | undefined>(undefined);

  // O card muda de coluna assim que solta. O React segura esse estado otimista
  // até a transição acabar: em caso de erro ele volta sozinho para a coluna de
  // origem, e no sucesso o router.refresh() traz os dados já atualizados.
  const [cards, moverCard] = useOptimistic(
    festas,
    (atual: FestaCard[], mov: { id: string; status: PartyStatus }) =>
      atual.map((c) => (c.id === mov.id ? { ...c, status: mov.status } : c)),
  );
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<PartyStatus | null>(null);
  const [, startTransition] = useTransition();

  function soltarEm(id: string, novo: PartyStatus) {
    setArrastando(null);
    setAlvo(null);
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === novo) return;

    startTransition(async () => {
      moverCard({ id, status: novo });
      const res = await mudarStatusFesta(id, novo);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(`Movida para ${PARTY_STATUS_LABEL[novo]}.`);
        router.refresh();
      }
    });
  }

  const canceladas = cards.filter((f) => f.status === "cancelada");

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

      {cards.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="size-6" />}
          title="Nenhuma festa cadastrada"
          description="Clique em “Nova festa” para começar a montar a operação."
        />
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUNAS.map((col) => {
            const itens = cards.filter((f) => f.status === col.status);
            const ativa = alvo === col.status && arrastando !== null;
            // Colunas dividem a largura disponível e só entram em scroll
            // horizontal quando não cabem no mínimo de 15rem. Esse mínimo é o
            // que faz as 6 colunas caberem inteiras numa tela de 1920.
            return (
              <div key={col.status} className="min-w-60 flex-1">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={cn("size-2 rounded-full", col.dot)} />
                  <h3 className="text-sm font-semibold">{PARTY_STATUS_LABEL[col.status]}</h3>
                  <span className="text-xs text-muted-foreground">{itens.length}</span>
                </div>
                <div
                  onDragOver={(e) => {
                    if (!arrastando) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setAlvo(col.status);
                  }}
                  onDragLeave={(e) => {
                    // Só limpa quando o ponteiro sai da coluna inteira, não ao
                    // passar de um card para outro dentro dela.
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    setAlvo((a) => (a === col.status ? null : a));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = arrastando ?? e.dataTransfer.getData("text/plain");
                    if (id) soltarEm(id, col.status);
                  }}
                  className={cn(
                    "min-h-24 space-y-2 rounded-xl p-1 transition-colors",
                    ativa && "bg-verde/5 ring-2 ring-verde ring-offset-2 ring-offset-background",
                  )}
                >
                  {itens.map((f) => (
                    <FestaMiniCard
                      key={f.id}
                      f={f}
                      arrastavel
                      arrastando={arrastando === f.id}
                      onDragStart={(e) => {
                        setArrastando(f.id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", f.id);
                      }}
                      onDragEnd={() => {
                        setArrastando(null);
                        setAlvo(null);
                      }}
                    />
                  ))}
                  {itens.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      {ativa ? "Soltar aqui" : "Vazio"}
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
            modifiers={{ temFesta: cards.map((f) => fromISODate(f.data)) }}
            modifiersClassNames={{
              temFesta: "relative font-bold text-verde-escuro",
            }}
            className="rounded-xl border border-border bg-card"
          />
          <div>
            {(() => {
              const iso = dia ? toISODateLocal(dia) : null;
              const doDia = iso ? cards.filter((f) => f.data === iso) : [];
              if (!iso)
                return (
                  <p className="px-1 py-8 text-center text-sm text-muted-foreground">
                    Selecione um dia para ver as festas.
                  </p>
                );
              if (doDia.length === 0)
                return (
                  <p className="px-1 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma festa em {formatDate(iso)}.
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

function FestaMiniCard({
  f,
  arrastavel = false,
  arrastando = false,
  onDragStart,
  onDragEnd,
}: {
  f: FestaCard;
  arrastavel?: boolean;
  arrastando?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLAnchorElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={`/admin/festas/${f.id}`}
      draggable={arrastavel}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative block rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        arrastavel && "cursor-grab active:cursor-grabbing",
        arrastando && "opacity-40",
      )}
    >
      {arrastavel && (
        <GripVertical className="absolute right-1 top-1 size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/50" />
      )}
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
