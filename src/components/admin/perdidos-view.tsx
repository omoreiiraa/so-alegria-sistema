"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle, Phone, PartyPopper, RotateCcw, Search, UserX, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { CampoBusca, Chip } from "@/components/common/filtros";
import { MarcarPerdidoDialog } from "@/components/admin/marcar-perdido";
import { buscaCliente } from "@/lib/utils/texto";
import { formatDate, todayISO } from "@/lib/utils/date";
import { formatPhoneNational } from "@/lib/utils/phone";
import { formatBRL } from "@/lib/utils/money";
import { linkWhatsApp } from "@/lib/clientes";
import { mudarStatusFesta } from "@/actions/festas";
import { VALIDADE_ORCAMENTO_DIAS } from "@/lib/orcamento-validade";
import { MOTIVOS_PERDA, MOTIVO_PERDA_LABEL, type MotivoPerda } from "@/types/domain";

export type ClientePerdido = {
  id: string;
  cliente: string | null;
  telefone: string | null;
  whatsapp: string;
  aniversariante: string | null;
  dataFesta: string;
  tipo: string | null;
  valor: number | null;
  /** null = cancelada antes de existir motivo (antes da migration 0036). */
  motivo: MotivoPerda | null;
  obs: string | null;
  /** Orçamento vencido que ninguém marcou ainda: segue em "orcamento". */
  pendente: boolean;
  /** Dia em que virou perdido (YYYY-MM-DD). */
  perdidoEm: string;
};

function mensagem(p: ClientePerdido): string {
  const saudacao = p.cliente ? `Olá, ${p.cliente}!` : "Olá!";
  const festa = p.aniversariante ? `a festa de ${p.aniversariante}` : "a sua festa";
  return (
    `${saudacao} Aqui é da Só Alegria — Recreação e Discoteca. ` +
    `Passando para saber se ainda podemos ajudar com ${festa}. ` +
    "Se quiser, atualizamos o orçamento para você!"
  );
}

export function PerdidosView({ perdidos }: { perdidos: ClientePerdido[] }) {
  // A busca do kanban de Festas chega aqui pelo ?q= dos links "em Vendidos/Perdidos".
  const [busca, setBusca] = useState(useSearchParams().get("q") ?? "");
  const [motivo, setMotivo] = useState<MotivoPerda | "sem_motivo" | null>(null);
  const [ano, setAno] = useState<number | null>(null);

  const anos = useMemo(
    () => [...new Set(perdidos.map((p) => Number(p.perdidoEm.slice(0, 4))))].sort((a, b) => b - a),
    [perdidos],
  );
  const semMotivo = perdidos.some((p) => p.motivo === null);

  const visiveis = perdidos
    .filter((p) =>
      buscaCliente(busca, { nomes: [p.cliente, p.aniversariante], telefone: p.telefone }),
    )
    .filter((p) =>
      motivo === null ? true : motivo === "sem_motivo" ? p.motivo === null : p.motivo === motivo,
    )
    .filter((p) => ano === null || p.perdidoEm.startsWith(`${ano}-`));

  if (perdidos.length === 0)
    return (
      <EmptyState
        icon={<UserX className="size-6" />}
        title="Nenhum cliente perdido"
        description={`Orçamentos sem resposta há mais de ${VALIDADE_ORCAMENTO_DIAS} dias e festas canceladas aparecem aqui.`}
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CampoBusca valor={busca} onChange={setBusca} />
        {anos.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Chip ativo={ano === null} onClick={() => setAno(null)}>
              Todos os anos
            </Chip>
            {anos.map((a) => (
              <Chip key={a} ativo={ano === a} onClick={() => setAno(a)}>
                {a}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Motivo:</span>
        <Chip ativo={motivo === null} onClick={() => setMotivo(null)}>
          Todos
        </Chip>
        {MOTIVOS_PERDA.map((m) => (
          <Chip key={m} ativo={motivo === m} onClick={() => setMotivo(m)}>
            {MOTIVO_PERDA_LABEL[m]}
          </Chip>
        ))}
        {semMotivo && (
          <Chip ativo={motivo === "sem_motivo"} onClick={() => setMotivo("sem_motivo")}>
            Sem motivo
          </Chip>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {visiveis.length} {visiveis.length === 1 ? "cliente" : "clientes"}
      </p>

      {visiveis.length === 0 ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title="Nenhum cliente encontrado"
          description="Confira o nome ou o telefone, ou mude os filtros."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visiveis.map((p) => (
            <CardPerdido key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardPerdido({ p }: { p: ClientePerdido }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [marcar, setMarcar] = useState(false);
  // Recuperar devolve a festa ao kanban, em Orçamento. Se a data dela já
  // passou, abre a edição para o cliente escolher uma data nova.
  const dataPassou = p.dataFesta < todayISO();

  function recuperar() {
    startTransition(async () => {
      const res = await mudarStatusFesta(p.id, "orcamento");
      if (res?.error) toast.error(res.error);
      else if (dataPassou) {
        toast.success("De volta ao quadro de Festas. Ajuste a data da festa.");
        router.push(`/admin/festas/${p.id}/editar`);
      } else {
        toast.success(`De volta ao quadro de Festas, em Orçamento, com mais ${VALIDADE_ORCAMENTO_DIAS} dias de validade.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold">{p.cliente ?? "Cliente sem nome"}</h3>
          {p.telefone && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3" /> {formatPhoneNational(p.telefone)}
            </p>
          )}
        </div>
        {p.pendente ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-laranja/15 px-2 py-0.5 text-xs font-semibold text-laranja-escuro">
            <Hourglass className="size-3" /> Orçamento vencido
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-vermelho/10 px-2 py-0.5 text-xs font-semibold text-vermelho">
            {p.motivo ? MOTIVO_PERDA_LABEL[p.motivo] : "Cancelada"}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <Link href={`/admin/festas/${p.id}`} className="flex items-center gap-1.5 hover:text-foreground">
          <PartyPopper className="size-3 shrink-0" />
          <span className="truncate">
            Festa em {formatDate(p.dataFesta)} · {p.tipo ?? "Festa"}
            {p.aniversariante && ` · ${p.aniversariante}`}
            {p.valor != null && ` · ${formatBRL(p.valor)}`}
          </span>
        </Link>
        <p>
          {p.pendente ? `Venceu em ${formatDate(p.perdidoEm)} sem resposta` : `Perdido em ${formatDate(p.perdidoEm)}`}
        </p>
        {p.obs && <p className="whitespace-pre-line rounded-md bg-muted px-2 py-1.5">{p.obs}</p>}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button
          render={<a href={linkWhatsApp(p.whatsapp, mensagem(p))} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
          size="sm"
          className="bg-verde font-semibold text-white hover:bg-verde-escuro"
        >
          <MessageCircle className="size-4" /> WhatsApp
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={recuperar}
          disabled={pending}
          title="Volta para o quadro de Festas, em Orçamento"
        >
          <RotateCcw className="size-4" /> Recuperar
        </Button>
        {p.pendente && (
          <Button size="sm" variant="ghost" onClick={() => setMarcar(true)} disabled={pending}>
            Marcar como perdido
          </Button>
        )}
      </div>
      {dataPassou && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          A data desta festa já passou: ao recuperar, escolha uma data nova.
        </p>
      )}

      {p.pendente && (
        <MarcarPerdidoDialog
          festaId={p.id}
          cliente={p.cliente}
          motivoInicial="sem_resposta"
          open={marcar}
          onOpenChange={setMarcar}
        />
      )}
    </div>
  );
}
