"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import {
  LayoutGrid,
  CalendarDays,
  Plane,
  Users,
  MapPin,
  Clock,
  GripVertical,
  Search,
  X,
  Hourglass,
  Trophy,
  UserX,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/empty-state";
import {
  FestasFiltros,
  contarFiltros,
  type FiltrosFestas,
} from "@/components/admin/festas-filtros";
import { cn } from "@/lib/utils";
import { buscaCliente } from "@/lib/utils/texto";
import {
  fromISODate,
  toISODateLocal,
  formatDate,
  formatTime,
  todayISO,
  addDaysISO,
} from "@/lib/utils/date";
import { VALIDADE_ORCAMENTO_DIAS, type ValidadeOrcamento } from "@/lib/orcamento-validade";
import { mudarStatusFesta, moverParaVendidos } from "@/actions/festas";
import { MarcarPerdidoDialog } from "@/components/admin/marcar-perdido";
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
  /** Paga que já foi movida para Vendidos: fora do quadro. */
  arquivada: boolean;
  aniversariante: string | null;
  /** E.164, como está no banco. */
  telefone: string | null;
  tipo: string | null;
  local: string;
  total: number;
  confirmados: number;
  /** Prazo do orçamento; só existe enquanto a festa está em "Orçamento". */
  orcamento: ValidadeOrcamento | null;
};

/**
 * "Recuperação" não é status do banco: é o orçamento que venceu sem resposta
 * (ADR-0027). Por isso a coluna não recebe card arrastado — ela se enche
 * sozinha, e o card sai dela quando é fechado ou volta para Orçamento.
 */
type ColunaId = PartyStatus | "recuperacao";

const COLUNAS: { id: ColunaId; titulo: string; dot: string }[] = [
  { id: "orcamento", titulo: "Orçamento", dot: "border border-dashed border-muted-foreground bg-transparent" },
  { id: "recuperacao", titulo: "Recuperação", dot: "bg-vermelho" },
  { id: "fechada", titulo: "Fechada", dot: "bg-muted-foreground/40" },
  { id: "escalada", titulo: "Escalada", dot: "bg-laranja" },
  { id: "confirmada", titulo: "Confirmada", dot: "bg-verde" },
  { id: "realizada", titulo: "Realizada", dot: "bg-verde-escuro" },
  { id: "paga", titulo: "Paga", dot: "bg-amarelo" },
];

/**
 * Paga fica no quadro enquanto é recente — é o controle da semana. Depois sai,
 * e o cliente segue em Vendidos. Perdida (cancelada) nunca fica: vai para
 * Perdidos, de onde o "Recuperar" a devolve ao quadro. Ver ADR-0031.
 */
const DIAS_PAGA_NO_QUADRO = 30;

function colunaDe(f: FestaCard): ColunaId {
  return f.status === "orcamento" && f.orcamento?.vencido ? "recuperacao" : f.status;
}

function combinaBusca(f: FestaCard, busca: string): boolean {
  return buscaCliente(busca, { nomes: [f.contratante, f.aniversariante], telefone: f.telefone });
}

function combinaFiltros(f: FestaCard, fl: FiltrosFestas): boolean {
  if (fl.ano !== null && !f.data.startsWith(`${fl.ano}-`)) return false;
  if (fl.ano !== null && fl.mes !== null && f.data.slice(5, 7) !== String(fl.mes).padStart(2, "0"))
    return false;
  if (fl.de && f.data < fl.de) return false;
  if (fl.ate && f.data > fl.ate) return false;
  if (fl.tipo !== null && !(f.tipo ?? "").split(" + ").includes(fl.tipo)) return false;
  if (fl.soViagem && !f.isViagem) return false;
  return true;
}

// ── Estado na URL ──────────────────────────────────────────────────────────
// Busca e filtros vão para a query string: ao abrir uma festa e voltar, a
// pesquisa continua lá. É gravado com history.replaceState, que não refaz a
// consulta no servidor a cada tecla.

function lerDaUrl(p: URLSearchParams): { busca: string; filtros: FiltrosFestas; view: "kanban" | "calendario" } {
  const num = (k: string) => {
    const n = Number(p.get(k));
    return p.get(k) && Number.isInteger(n) ? n : null;
  };
  return {
    busca: p.get("q") ?? "",
    view: p.get("view") === "calendario" ? "calendario" : "kanban",
    filtros: {
      ano: num("ano"),
      mes: num("mes"),
      de: p.get("de") ?? "",
      ate: p.get("ate") ?? "",
      tipo: p.get("tipo"),
      soViagem: p.get("viagem") === "1",
    },
  };
}

function escreverNaUrl(busca: string, f: FiltrosFestas, view: "kanban" | "calendario") {
  const p = new URLSearchParams();
  if (view === "calendario") p.set("view", view);
  if (busca.trim()) p.set("q", busca.trim());
  if (f.ano !== null) p.set("ano", String(f.ano));
  if (f.ano !== null && f.mes !== null) p.set("mes", String(f.mes));
  if (f.de) p.set("de", f.de);
  if (f.ate) p.set("ate", f.ate);
  if (f.tipo !== null) p.set("tipo", f.tipo);
  if (f.soViagem) p.set("viagem", "1");
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

export function FestasView({ festas }: { festas: FestaCard[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [inicial] = useState(() => lerDaUrl(params));
  const [view, setView] = useState<"kanban" | "calendario">(inicial.view);
  const [busca, setBusca] = useState(inicial.busca);
  const [filtros, setFiltros] = useState<FiltrosFestas>(inicial.filtros);
  const [dia, setDia] = useState<Date | undefined>(undefined);

  useEffect(() => {
    escreverNaUrl(busca, filtros, view);
  }, [busca, filtros, view]);

  // O card muda de coluna assim que solta. O React segura esse estado otimista
  // até a transição acabar: em caso de erro ele volta sozinho para a coluna de
  // origem, e no sucesso o router.refresh() traz os dados já atualizados.
  const [cards, moverCard] = useOptimistic(
    festas,
    (atual: FestaCard[], mov: { id: string; status: PartyStatus; arquivar?: boolean }) =>
      atual.map((c) => {
        if (c.id !== mov.id) return c;
        // Voltar para Orçamento renova o prazo: a previsão já nasce válida.
        const hoje = todayISO();
        const orcamento: ValidadeOrcamento | null =
          mov.status === "orcamento"
            ? {
                emitidoEm: hoje,
                validoAte: addDaysISO(hoje, VALIDADE_ORCAMENTO_DIAS),
                vencido: false,
                diasRestantes: VALIDADE_ORCAMENTO_DIAS,
              }
            : null;
        return { ...c, status: mov.status, orcamento, arquivada: mov.arquivar ?? false };
      }),
  );
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<ColunaId | null>(null);
  const [perdendo, setPerdendo] = useState<FestaCard | null>(null);
  const [, startTransition] = useTransition();

  const pesquisando = busca.trim() !== "" || contarFiltros(filtros) > 0;

  const encontrados = useMemo(
    () => cards.filter((f) => combinaBusca(f, busca) && combinaFiltros(f, filtros)),
    [cards, busca, filtros],
  );
  const limitePaga = addDaysISO(todayISO(), -DIAS_PAGA_NO_QUADRO);
  const pagaAntiga = (f: FestaCard) =>
    f.status === "paga" && (f.arquivada || f.data < limitePaga);
  // O calendário é por data, não enche com o tempo: mostra também as pagas
  // antigas. Só as perdidas ficam de fora dele.
  const visiveis = encontrados.filter(
    (f) => f.status !== "cancelada" && (view === "calendario" || !pagaAntiga(f)),
  );
  // Avisa o que a pesquisa achou fora do quadro.
  const emVendidos = view === "kanban" ? encontrados.filter(pagaAntiga).length : 0;
  const emPerdidos = encontrados.filter((f) => f.status === "cancelada").length;

  const anos = useMemo(
    () => [...new Set(festas.map((f) => Number(f.data.slice(0, 4))))].sort((a, b) => b - a),
    [festas],
  );
  const tipos = useMemo(
    () =>
      [...new Set(festas.flatMap((f) => (f.tipo ? f.tipo.split(" + ") : [])))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [festas],
  );

  function soltarEm(id: string, destino: ColunaId) {
    setArrastando(null);
    setAlvo(null);
    if (destino === "recuperacao") return;
    const card = cards.find((c) => c.id === id);
    if (!card || colunaDe(card) === destino) return;

    startTransition(async () => {
      moverCard({ id, status: destino });
      const res = await mudarStatusFesta(id, destino);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(
          destino === "orcamento" && card.status === "orcamento"
            ? `Orçamento renovado por mais ${VALIDADE_ORCAMENTO_DIAS} dias.`
            : destino === "realizada"
              ? "Festa realizada! O cliente também aparece em Vendidos."
              : `Movida para ${PARTY_STATUS_LABEL[destino]}.`,
        );
        router.refresh();
      }
    });
  }

  /** Liga uma área do quadro ao arrastar-e-soltar. */
  function arquivar(card: FestaCard) {
    startTransition(async () => {
      moverCard({ id: card.id, status: "paga", arquivar: true });
      const res = await moverParaVendidos(card.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Festa movida para Vendidos.");
        router.refresh();
      }
    });
  }

  const alvoDeSoltar = (id: ColunaId) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!arrastando) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setAlvo(id);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Só limpa quando o ponteiro sai da área inteira, não ao passar de um
      // card para outro dentro dela.
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setAlvo((a) => (a === id ? null : a));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const card = arrastando ?? e.dataTransfer.getData("text/plain");
      if (card) soltarEm(card, id);
    },
  });

  const q = busca.trim() ? `?q=${encodeURIComponent(busca.trim())}` : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <ToggleBtn active={view === "kanban"} onClick={() => setView("kanban")} icon={<LayoutGrid className="size-4" />}>
            Kanban
          </ToggleBtn>
          <ToggleBtn active={view === "calendario"} onClick={() => setView("calendario")} icon={<CalendarDays className="size-4" />}>
            Calendário
          </ToggleBtn>
        </div>

        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, aniversariante ou telefone"
            aria-label="Buscar festas"
            className="h-9 pl-8 pr-8"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <FestasFiltros filtros={filtros} onChange={setFiltros} anos={anos} tipos={tipos} />

        {pesquisando && (
          <span className="text-sm text-muted-foreground">
            {visiveis.length} {visiveis.length === 1 ? "festa encontrada" : "festas encontradas"}
            {view === "kanban" && emVendidos > 0 && (
              <>
                {" · "}
                <Link href={`/admin/vendidos${q}`} className="font-medium text-verde-escuro underline">
                  {emVendidos} {emVendidos === 1 ? "paga antiga" : "pagas antigas"} em Vendidos
                </Link>
              </>
            )}
            {emPerdidos > 0 && (
              <>
                {" · "}
                <Link href={`/admin/perdidos${q}`} className="font-medium text-vermelho underline">
                  {emPerdidos} em Perdidos
                </Link>
              </>
            )}
          </span>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="size-6" />}
          title="Nenhuma festa cadastrada"
          description="Clique em “Nova festa” para começar a montar a operação."
        />
      ) : pesquisando && visiveis.length === 0 ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title={view === "kanban" ? "Nenhuma festa em andamento encontrada" : "Nenhuma festa encontrada"}
          description={
            emVendidos + emPerdidos > 0
              ? "A pesquisa achou festas fora do quadro — veja os links acima."
              : "Confira o nome ou o telefone, ou limpe os filtros."
          }
        />
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUNAS.map((col) => {
            const itens = visiveis.filter((f) => colunaDe(f) === col.id);
            const recebe = col.id !== "recuperacao";
            const ativa = recebe && alvo === col.id && arrastando !== null;
            // Colunas dividem a largura disponível e só entram em scroll
            // horizontal quando não cabem no mínimo de 14rem.
            return (
              <div key={col.id} className="min-w-56 flex-1">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={cn("size-2 rounded-full", col.dot)} />
                  <h3 className="text-sm font-semibold">{col.titulo}</h3>
                  <span className="text-xs text-muted-foreground">{itens.length}</span>
                </div>
                {col.id === "recuperacao" && (
                  <p className="mb-2 px-1 text-[11px] leading-snug text-muted-foreground">
                    Orçamentos com mais de {VALIDADE_ORCAMENTO_DIAS} dias sem resposta. Arraste para
                    Orçamento para renovar ou para Fechada se o cliente topou.
                  </p>
                )}
                <div
                  {...(recebe ? alvoDeSoltar(col.id) : {})}
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
                      onMarcar={(status) => soltarEm(f.id, status)}
                      onPerder={() => setPerdendo(f)}
                      onArquivar={() => arquivar(f)}
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
            // Filtrar por ano/mês leva o calendário direto para lá.
            key={`${filtros.ano ?? ""}-${filtros.mes ?? ""}`}
            defaultMonth={
              filtros.ano !== null ? new Date(filtros.ano, (filtros.mes ?? 1) - 1, 1) : undefined
            }
            mode="single"
            selected={dia}
            onSelect={setDia}
            locale={ptBR}
            showOutsideDays={false}
            modifiers={{ temFesta: visiveis.map((f) => fromISODate(f.data)) }}
            modifiersClassNames={{
              temFesta: "relative font-bold text-verde-escuro",
            }}
            className="rounded-xl border border-border bg-card"
          />
          <div>
            {(() => {
              const iso = dia ? toISODateLocal(dia) : null;
              if (!iso) {
                // Pesquisando, a lista ao lado já mostra o resultado inteiro.
                if (pesquisando)
                  return (
                    <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                      {visiveis.map((f) => (
                        <FestaMiniCard key={f.id} f={f} />
                      ))}
                    </div>
                  );
                return (
                  <p className="px-1 py-8 text-center text-sm text-muted-foreground">
                    Selecione um dia para ver as festas.
                  </p>
                );
              }
              const doDia = visiveis.filter((f) => f.data === iso);
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

      {perdendo && (
        <MarcarPerdidoDialog
          key={perdendo.id}
          festaId={perdendo.id}
          cliente={perdendo.contratante}
          motivoInicial={perdendo.status === "orcamento" ? "sem_resposta" : undefined}
          open
          onOpenChange={(aberto) => !aberto && setPerdendo(null)}
        />
      )}
    </div>
  );
}

function PrazoOrcamento({ v }: { v: ValidadeOrcamento }) {
  if (v.vencido)
    return (
      <p className="flex items-center gap-1.5 font-medium text-vermelho">
        <Hourglass className="size-3" /> Venceu em {formatDate(v.validoAte)}
      </p>
    );
  return (
    <p className={cn("flex items-center gap-1.5", v.diasRestantes <= 1 && "font-medium text-laranja-escuro")}>
      <Hourglass className="size-3" />
      {v.diasRestantes === 0
        ? "Vence hoje"
        : `Válido até ${formatDate(v.validoAte)} (${v.diasRestantes} dia${v.diasRestantes > 1 ? "s" : ""})`}
    </p>
  );
}

/**
 * Menu "⋯" do card: marcar como realizada, paga ou perdida sem abrir a festa.
 * Fica fora do <Link> — botão dentro de link não é HTML válido e o clique
 * abriria a festa junto.
 */
function MenuCard({
  f,
  onMarcar,
  onPerder,
  onArquivar,
}: {
  f: FestaCard;
  onMarcar: (status: "realizada" | "paga") => void;
  onPerder: () => void;
  onArquivar: () => void;
}) {
  const emAndamento = f.status !== "realizada" && f.status !== "paga";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Ações da festa"
        className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {emAndamento && (
          <DropdownMenuItem onClick={() => onMarcar("realizada")}>
            <Trophy className="text-verde-escuro" /> Marcar como realizada
          </DropdownMenuItem>
        )}
        {f.status === "realizada" && (
          <DropdownMenuItem onClick={() => onMarcar("paga")}>
            <Wallet className="text-amarelo" /> Marcar como paga
          </DropdownMenuItem>
        )}
        {f.status === "paga" && (
          <DropdownMenuItem onClick={onArquivar}>
            <Trophy className="text-verde-escuro" /> Mover para Vendidos
          </DropdownMenuItem>
        )}
        {emAndamento && (
          <DropdownMenuItem variant="destructive" onClick={onPerder}>
            <UserX /> Marcar como perdido
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FestaMiniCard({
  f,
  arrastavel = false,
  arrastando = false,
  onDragStart,
  onDragEnd,
  onMarcar,
  onPerder,
  onArquivar,
}: {
  f: FestaCard;
  arrastavel?: boolean;
  arrastando?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLAnchorElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLAnchorElement>) => void;
  onMarcar?: (status: "realizada" | "paga") => void;
  onPerder?: () => void;
  onArquivar?: () => void;
}) {
  const comMenu = !!onMarcar && !!onPerder && !!onArquivar;
  return (
    <div className="relative">
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
        {arrastavel && !comMenu && (
          <GripVertical className="absolute right-1 top-1 size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/50" />
        )}
        <div className={cn("flex items-start justify-between gap-2", comMenu && "pr-6")}>
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
          {f.orcamento ? (
            <PrazoOrcamento v={f.orcamento} />
          ) : (
            <p className="flex items-center gap-1.5">
              <Users className="size-3" /> {f.confirmados}/{f.total} confirmados
            </p>
          )}
        </div>
      </Link>
      {comMenu && <MenuCard f={f} onMarcar={onMarcar!} onPerder={onPerder!} onArquivar={onArquivar!} />}
    </div>
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
