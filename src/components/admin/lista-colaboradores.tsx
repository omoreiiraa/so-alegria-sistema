"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { normalizarTexto } from "@/lib/utils/texto";

export type ColabRow = {
  id: string;
  cadastro_preenchido: boolean;
  nome_completo: string | null;
  nome_tio: string | null;
  email: string | null;
  aprovado: boolean;
  ativo: boolean;
  cidade: string | null;
  uf: string | null;
  created_at: string;
};

const ORDENS = {
  az: "Nome (A–Z)",
  za: "Nome (Z–A)",
  recentes: "Entrada: mais recentes",
  antigos: "Entrada: mais antigos",
} as const;
type Ordem = keyof typeof ORDENS;

/** O mesmo texto que o card mostra — ordenar pelo que o olho lê. */
function nomeVisivel(c: ColabRow) {
  return c.nome_completo ?? c.email ?? "Sem nome";
}

function ColabCard({ c }: { c: ColabRow }) {
  return (
    <Link href={`/admin/colaboradores/${c.id}`} className="block">
      <Card
        className={cn(
          "transition-shadow hover:shadow-md",
          !c.ativo && "opacity-60",
        )}
      >
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium">
              {nomeVisivel(c)}
              {c.nome_tio && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({c.nome_tio})
                </span>
              )}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {c.email ?? "aguardando cadastro"}
              {c.cidade ? ` · ${c.cidade}/${c.uf ?? ""}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!c.ativo && <Badge variant="secondary">Inativo</Badge>}
            {!c.cadastro_preenchido && (
              <Badge className="bg-laranja/15 text-laranja-escuro">Cadastro pendente</Badge>
            )}
            {c.aprovado ? (
              <Badge variant="secondary">Aprovado</Badge>
            ) : (
              <Badge className="bg-vermelho/10 text-vermelho">Pendente</Badge>
            )}
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ListaColaboradores({ colaboradores }: { colaboradores: ColabRow[] }) {
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recentes");

  const termo = normalizarTexto(busca);

  const filtrados = useMemo(() => {
    // Busca pelo nome, pelo nome de tio e pelo e-mail: na prática o escritório
    // procura pelos três, e o card mostra todos eles.
    const lista = termo
      ? colaboradores.filter((c) =>
          [c.nome_completo, c.nome_tio, c.email].some(
            (campo) => campo && normalizarTexto(campo).includes(termo),
          ),
        )
      : colaboradores;

    // pt-BR + sensitivity "base": "Ângela" cai junto de "Angela", não no fim.
    const porNome = (a: ColabRow, b: ColabRow) =>
      nomeVisivel(a).localeCompare(nomeVisivel(b), "pt-BR", { sensitivity: "base" });
    const porEntrada = (a: ColabRow, b: ColabRow) =>
      a.created_at.localeCompare(b.created_at);

    const ordenar = {
      az: porNome,
      za: (a: ColabRow, b: ColabRow) => porNome(b, a),
      antigos: porEntrada,
      recentes: (a: ColabRow, b: ColabRow) => porEntrada(b, a),
    }[ordem];

    return [...lista].sort(ordenar);
  }, [colaboradores, termo, ordem]);

  const pendentes = filtrados.filter((c) => !c.aprovado);
  const aprovados = filtrados.filter((c) => c.aprovado);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar colaborador pelo nome…"
            aria-label="Buscar colaborador pelo nome"
            className="pl-9"
          />
        </div>
        <Select value={ordem} onValueChange={(v) => setOrdem(String(v) as Ordem)}>
          <SelectTrigger aria-label="Ordenar colaboradores" className="w-full sm:w-56">
            {/* Formata explícito: o gatilho tem de mostrar o rótulo, não a chave. */}
            <SelectValue>{(v) => ORDENS[String(v) as Ordem] ?? ORDENS.recentes}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ORDENS) as Ordem[]).map((o) => (
              <SelectItem key={o} value={o}>
                {ORDENS[o]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum colaborador encontrado para “{busca.trim()}”.
        </p>
      ) : (
        <>
          {pendentes.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-vermelho">
                Aguardando cadastro/aprovação ({pendentes.length})
              </h2>
              <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {pendentes.map((c) => (
                  <ColabCard key={c.id} c={c} />
                ))}
              </div>
            </section>
          )}

          {aprovados.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Equipe ({aprovados.length})
              </h2>
              <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {aprovados.map((c) => (
                  <ColabCard key={c.id} c={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
