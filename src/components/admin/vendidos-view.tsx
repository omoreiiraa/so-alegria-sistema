"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Cake, MessageCircle, PartyPopper, Phone, Search, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { CampoBusca, Chip } from "@/components/common/filtros";
import { cn } from "@/lib/utils";
import { buscaCliente } from "@/lib/utils/texto";
import { formatDate } from "@/lib/utils/date";
import { formatPhoneNational } from "@/lib/utils/phone";
import { formatBRL } from "@/lib/utils/money";
import { linkWhatsApp } from "@/lib/clientes";

export type ClienteVendido = {
  chave: string;
  cliente: string | null;
  telefone: string | null;
  /** Número no formato do wa.me; "" quando o telefone não é válido. */
  whatsapp: string;
  /** Da mais recente para a mais antiga. */
  festas: {
    id: string;
    data: string;
    tipo: string | null;
    aniversariante: string | null;
    idade: number | null;
    valor: number | null;
  }[];
  /** Próxima vez que a data da última festa se repete (YYYY-MM-DD). */
  proximaData: string;
  diasAteProxima: number;
  proximaIdade: number | null;
};

type Janela = "30" | "60" | "90" | "todos";

const JANELAS: { id: Janela; label: string }[] = [
  { id: "30", label: "Próximos 30 dias" },
  { id: "60", label: "60 dias" },
  { id: "90", label: "90 dias" },
  { id: "todos", label: "Todos" },
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function mensagem(c: ClienteVendido): string {
  const ultima = c.festas[0];
  const saudacao = c.cliente ? `Olá, ${c.cliente}!` : "Olá!";
  const quem = ultima.aniversariante
    ? `o aniversário de ${ultima.aniversariante}${c.proximaIdade != null ? ` (${c.proximaIdade} anos)` : ""} está chegando`
    : "a data da sua festa está chegando de novo";
  return (
    `${saudacao} Aqui é da Só Alegria — Recreação e Discoteca. ` +
    `Vimos que ${quem} e adoraríamos fazer parte mais uma vez! ` +
    "Quer que a gente prepare um orçamento?"
  );
}

export function VendidosView({ clientes }: { clientes: ClienteVendido[] }) {
  // A busca do kanban de Festas chega aqui pelo ?q= dos links "em Vendidos/Perdidos".
  const [busca, setBusca] = useState(useSearchParams().get("q") ?? "");
  const [janela, setJanela] = useState<Janela>("todos");
  const [mes, setMes] = useState<number | null>(null);

  const visiveis = useMemo(
    () =>
      clientes
        .filter((c) =>
          buscaCliente(busca, {
            nomes: [c.cliente, ...c.festas.map((f) => f.aniversariante)],
            telefone: c.telefone,
          }),
        )
        .filter((c) => janela === "todos" || c.diasAteProxima <= Number(janela))
        .filter((c) => mes === null || Number(c.proximaData.slice(5, 7)) === mes)
        .sort((a, b) => a.diasAteProxima - b.diasAteProxima),
    [clientes, busca, janela, mes],
  );

  if (clientes.length === 0)
    return (
      <EmptyState
        icon={<Trophy className="size-6" />}
        title="Nenhum cliente vendido ainda"
        description="Quando uma festa for marcada como Realizada, o cliente aparece aqui para o follow-up."
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CampoBusca valor={busca} onChange={setBusca} />
        <div className="flex flex-wrap gap-1.5">
          {JANELAS.map((j) => (
            <Chip key={j.id} ativo={janela === j.id} onClick={() => setJanela(j.id)}>
              {j.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Mês da festa:</span>
        <Chip ativo={mes === null} onClick={() => setMes(null)}>
          Todos
        </Chip>
        {MESES.map((m, i) => (
          <Chip key={m} ativo={mes === i + 1} onClick={() => setMes(mes === i + 1 ? null : i + 1)}>
            {m}
          </Chip>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {visiveis.length} {visiveis.length === 1 ? "cliente" : "clientes"}
      </p>

      {visiveis.length === 0 ? (
        <EmptyState
          icon={<Search className="size-6" />}
          title="Nenhum cliente encontrado"
          description="Confira o nome ou o telefone, ou mude o período."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visiveis.map((c) => (
            <CardCliente key={c.chave} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardCliente({ c }: { c: ClienteVendido }) {
  const ultima = c.festas[0];
  const perto = c.diasAteProxima <= 30;
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold">{c.cliente ?? "Cliente sem nome"}</h3>
          {c.telefone && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3" /> {formatPhoneNational(c.telefone)}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-verde/10 px-2 py-0.5 text-xs font-semibold text-verde-escuro">
          {c.festas.length} {c.festas.length === 1 ? "festa" : "festas"}
        </span>
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          perto ? "bg-laranja/10 text-laranja-escuro" : "bg-muted text-muted-foreground",
        )}
      >
        <Cake className="size-4 shrink-0" />
        <span>
          <span className="font-semibold">{formatDate(c.proximaData)}</span>
          {c.proximaIdade != null && ` · faz ${c.proximaIdade} anos`}
          {" · "}
          {c.diasAteProxima === 0 ? "é hoje" : `em ${c.diasAteProxima} dias`}
        </span>
      </div>

      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        {c.festas.slice(0, 3).map((f) => (
          <li key={f.id}>
            <Link href={`/admin/festas/${f.id}`} className="flex items-center gap-1.5 hover:text-foreground">
              <PartyPopper className="size-3 shrink-0" />
              <span className="truncate">
                {formatDate(f.data)} · {f.tipo ?? "Festa"}
                {f.aniversariante && ` · ${f.aniversariante}`}
                {f.idade != null && ` (${f.idade} anos)`}
                {f.valor != null && ` · ${formatBRL(f.valor)}`}
              </span>
            </Link>
          </li>
        ))}
        {c.festas.length > 3 && <li className="pl-4.5">+ {c.festas.length - 3} anteriores</li>}
      </ul>

      <div className="mt-auto flex gap-2 pt-4">
        <Button
          render={<a href={linkWhatsApp(c.whatsapp, mensagem(c))} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
          size="sm"
          className="bg-verde font-semibold text-white hover:bg-verde-escuro"
        >
          <MessageCircle className="size-4" /> Chamar no WhatsApp
        </Button>
        <Button render={<Link href={`/admin/festas/${ultima.id}`} />} nativeButton={false} size="sm" variant="outline">
          Ver última festa
        </Button>
      </div>
    </div>
  );
}
