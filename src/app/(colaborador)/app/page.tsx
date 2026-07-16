import { CalendarDays } from "lucide-react";
import { requireColaborador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/common/empty-state";
import {
  AssignmentCard,
  type EscalaItem,
} from "@/components/colaborador/assignment-card";
import { Badge } from "@/components/ui/badge";
import { CARGO_LABEL, CARGO_BASE } from "@/types/domain";
import type {
  AssignmentStatus,
  CargoType,
  PresenceMode,
} from "@/types/domain";

type Row = {
  id: string;
  status: AssignmentStatus;
  presence_mode: PresenceMode | null;
  horario_apresentacao: string | null;
  is_driver: boolean;
  cache_final: number | null;
  cache_custom: number | null;
  motivo_recusa: string | null;
  parties: {
    data: string;
    hora_inicio: string;
    hora_fim: string;
    is_viagem: boolean;
    duracao_horas: number | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    party_types: { nome: string } | null;
    partners: { nome: string; cidade: string | null; uf: string | null } | null;
  } | null;
};

function previewCache(
  cargo: CargoType,
  dur: number | null,
  viagem: boolean,
  driver: boolean,
): number | null {
  const base = CARGO_BASE[cargo];
  if (base == null || dur == null) return null;
  let s = base + (dur >= 5 + 59 / 60 ? 20 : 0);
  if (viagem) s *= 2;
  s += driver ? 50 : 0;
  return s;
}

function buildLocal(p: NonNullable<Row["parties"]>): string {
  if (p.partners?.nome) {
    return p.partners.cidade
      ? `${p.partners.nome} — ${p.partners.cidade}/${p.partners.uf ?? ""}`
      : p.partners.nome;
  }
  return [
    p.logradouro && `${p.logradouro}${p.numero ? `, ${p.numero}` : ""}`,
    p.bairro,
    p.cidade && `${p.cidade}${p.uf ? `/${p.uf}` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function EscalaPage() {
  const { userId, profile } = await requireColaborador();
  const nome = profile.nome_tio || profile.nome_completo?.split(" ")[0] || "tio";

  const supabase = await createClient();
  const { data } = await supabase
    .from("party_assignments")
    .select(
      `id, status, presence_mode, horario_apresentacao, is_driver, cache_final, cache_custom, motivo_recusa,
       parties ( data, hora_inicio, hora_fim, is_viagem, duracao_horas, logradouro, numero, bairro, cidade, uf,
         party_types ( nome ), partners ( nome, cidade, uf ) )`,
    )
    .eq("user_id", userId)
    .in("status", ["pendente", "confirmada"]);

  const rows = (data ?? []) as unknown as Row[];

  const items: EscalaItem[] = rows
    .filter((r) => r.parties)
    .map((r) => {
      const p = r.parties!;
      const cache =
        r.status === "confirmada"
          ? r.cache_final
          : r.cache_custom ??
            previewCache(profile.cargo, p.duracao_horas, p.is_viagem, r.is_driver);
      return {
        id: r.id,
        status: r.status,
        presenceMode: r.presence_mode,
        horarioApresentacao: r.horario_apresentacao,
        isDriver: r.is_driver,
        cache,
        cachePrevisto: r.status === "pendente" && r.cache_custom == null,
        motivoRecusa: r.motivo_recusa,
        party: {
          data: p.data,
          horaInicio: p.hora_inicio,
          horaFim: p.hora_fim,
          isViagem: p.is_viagem,
          tipo: p.party_types?.nome ?? null,
          local: buildLocal(p),
        },
      };
    })
    .sort((a, b) => a.party.data.localeCompare(b.party.data));

  const convites = items.filter((i) => i.status === "pendente");
  const confirmadas = items.filter((i) => i.status === "confirmada");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {nome} 👋
        </h1>
        <div className="mt-2">
          <Badge variant="secondary" className="bg-verde/10 text-verde-escuro">
            {CARGO_LABEL[profile.cargo]}
          </Badge>
        </div>
      </div>

      {convites.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-laranja-escuro">
            Convites pendentes ({convites.length})
          </h2>
          {convites.map((item) => (
            <AssignmentCard key={item.id} item={item} />
          ))}
        </section>
      )}

      {confirmadas.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Suas festas
          </h2>
          {confirmadas.map((item) => (
            <AssignmentCard key={item.id} item={item} />
          ))}
        </section>
      )}

      {items.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="size-6" />}
          title="Nenhuma festa por aqui ainda"
          description="Assim que o escritório escalar você para uma festa, ela aparece aqui com a opção de confirmar ou recusar."
        />
      )}
    </div>
  );
}
