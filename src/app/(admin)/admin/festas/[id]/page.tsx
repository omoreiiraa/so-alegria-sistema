import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Clock,
  MapPin,
  Cake,
  Users,
  Plane,
  Truck,
  UserCheck,
  Phone,
  PartyPopper,
} from "lucide-react";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { FestaStatusControl } from "@/components/admin/festa-status-control";
import { EscalarPanel } from "@/components/admin/escalar-panel";
import { RemoverEscalado } from "@/components/admin/remover-escalado";
import { ConviteLink } from "@/components/admin/convite-link";
import { MateriaisFesta, type Material } from "@/components/admin/materiais-festa";
import { GerarOrcamento } from "@/components/admin/gerar-orcamento";
import { ContratoFesta } from "@/components/admin/contrato-festa";
import { formatPhoneNational } from "@/lib/utils/phone";
import { formatDateLong, formatTime } from "@/lib/utils/date";
import { formatBRL } from "@/lib/utils/money";
import {
  CARGO_LABEL,
  PARTY_STATUS_LABEL,
  PRESENCE_MODE_LABEL,
  VEHICLE_TYPE_LABEL,
} from "@/types/domain";
import type {
  AssignmentStatus,
  CargoType,
  PartyStatus,
  PresenceMode,
  VehicleType,
} from "@/types/domain";

export const metadata: Metadata = { title: "Festa" };

type Festa = {
  id: string;
  status: PartyStatus;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  is_viagem: boolean;
  contratante_nome: string | null;
  aniversariante_nome: string | null;
  aniversariante_idade: number | null;
  qtd_criancas: number | null;
  qtd_recreadores: number | null;
  tema_festa: string | null;
  telefone_contato: string | null;
  valor_festa: number | null;
  orcamento_assinado_path: string | null;
  observacoes: string | null;
  observacoes_orcamento: string | null;
  fechada_por: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  party_types: { nome: string } | null;
  partners: { nome: string; cidade: string | null; uf: string | null } | null;
  party_vehicles: {
    vehicles: { id: string; apelido: string; tipo: VehicleType; placa: string | null } | null;
  }[];
  party_party_types: {
    party_types: { nome: string } | null;
  }[];
};

type Assignment = {
  id: string;
  status: AssignmentStatus;
  presence_mode: PresenceMode | null;
  horario_apresentacao: string | null;
  is_driver: boolean;
  cache_final: number | null;
  motivo_recusa: string | null;
  profile_id: string;
  profiles: {
    nome_completo: string | null;
    nome_tio: string | null;
    cargo: CargoType;
    celular: string | null;
  } | null;
  colaborador_links: {
    id: string;
    expira_em: string | null;
    usado_em: string | null;
    revogado_em: string | null;
    created_at: string;
  }[];
};

function localFesta(f: Festa): string {
  if (f.partners?.nome) {
    return f.partners.cidade
      ? `${f.partners.nome} — ${f.partners.cidade}/${f.partners.uf ?? ""}`
      : f.partners.nome;
  }
  return (
    [
      f.logradouro && `${f.logradouro}${f.numero ? `, ${f.numero}` : ""}`,
      f.bairro,
      f.cidade && `${f.cidade}${f.uf ? `/${f.uf}` : ""}`,
    ]
      .filter(Boolean)
      .join(" · ") || "Local a definir"
  );
}

function statusBadge(status: AssignmentStatus) {
  if (status === "confirmada")
    return <Badge className="bg-verde/15 text-verde-escuro">Confirmada</Badge>;
  if (status === "pendente")
    return <Badge className="bg-laranja/15 text-laranja-escuro">Pendente</Badge>;
  if (status === "recusada") return <Badge variant="secondary">Recusada</Badge>;
  return <Badge variant="secondary">Cancelada</Badge>;
}

export default async function FestaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEquipe();
  const { id } = await params;
  const supabase = await createClient();

  const { data: festaData } = await supabase
    .from("parties")
    .select(
      `id, status, data, hora_inicio, hora_fim, is_viagem, contratante_nome, aniversariante_nome,
       aniversariante_idade, qtd_criancas, qtd_recreadores, tema_festa, telefone_contato,
       valor_festa, orcamento_assinado_path, observacoes, observacoes_orcamento,
       fechada_por, logradouro,
       numero, bairro, cidade, uf,
       party_types ( nome ), partners ( nome, cidade, uf ),
       party_vehicles ( vehicles ( id, apelido, tipo, placa ) ),
       party_party_types ( party_types ( nome ) )`,
    )
    .eq("id", id)
    .single();

  if (!festaData) notFound();
  const festa = festaData as unknown as Festa;

  const [
    { data: aData },
    { data: elegiveis },
    { data: confl },
    { data: mData },
    { data: iData },
  ] = await Promise.all([
    supabase
      .from("party_assignments")
      .select(
        `id, status, presence_mode, horario_apresentacao, is_driver, cache_final, motivo_recusa, profile_id,
           profiles ( nome_completo, nome_tio, cargo, celular ),
           colaborador_links ( id, expira_em, usado_em, revogado_em, created_at )`,
      )
      .eq("party_id", id),
    supabase
      .from("profiles")
      .select("id, nome_completo, nome_tio, cargo")
      .eq("role", "colaborador")
      .eq("aprovado", true)
      .eq("ativo", true)
      .neq("cargo", "pendente"),
    supabase
      .from("party_assignments")
      .select("profile_id, parties!inner(data)")
      .eq("parties.data", festa.data)
      .neq("party_id", id)
      .in("status", ["pendente", "confirmada"]),
    supabase
      .from("party_stock_items")
      .select("id, qtd_levada, qtd_devolvida, qtd_perdida, stock_items ( nome )")
      .eq("party_id", id),
    supabase.from("stock_items").select("id, nome, categoria").eq("ativo", true).order("nome"),
  ]);

  const materiais: Material[] = (
    (mData ?? []) as unknown as {
      id: string;
      qtd_levada: number;
      qtd_devolvida: number | null;
      qtd_perdida: number;
      stock_items: { nome: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    nome: r.stock_items?.nome ?? "Item",
    qtdLevada: r.qtd_levada,
    qtdDevolvida: r.qtd_devolvida,
    qtdPerdida: r.qtd_perdida,
  }));
  const itensEstoque = (iData ?? []) as { id: string; nome: string; categoria: string | null }[];
  const festaRealizada = festa.status === "realizada" || festa.status === "paga";

  const assignments = (aData ?? []) as unknown as Assignment[];
  const assignedIds = new Set(assignments.map((a) => a.profile_id));
  const conflitoSet = new Set(
    ((confl ?? []) as unknown as { profile_id: string }[]).map((r) => r.profile_id),
  );

  const eligible = ((elegiveis ?? []) as {
    id: string;
    nome_completo: string | null;
    nome_tio: string | null;
    cargo: CargoType;
  }[])
    .filter((p) => !assignedIds.has(p.id))
    .map((p) => ({
      profileId: p.id,
      nome: p.nome_completo ?? p.nome_tio ?? "Colaborador",
      cargo: p.cargo,
      conflito: conflitoSet.has(p.id),
    }));

  const carros = festa.party_vehicles
    .map((pv) => pv.vehicles)
    .filter((v): v is NonNullable<typeof v> => !!v && v.tipo === "carro")
    .map((v) => ({ id: v.id, apelido: v.apelido, placa: v.placa }));

  const confirmados = assignments.filter((a) => a.status === "confirmada").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            render={<Link href="/admin/festas" />} nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {festa.party_party_types && festa.party_party_types.length > 0
                ? festa.party_party_types.map((pt) => pt.party_types?.nome).filter(Boolean).join(" + ")
                : festa.party_types?.nome ?? "Festa"}
            </h1>
            <p className="text-sm capitalize text-muted-foreground">
              {formatDateLong(festa.data)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{PARTY_STATUS_LABEL[festa.status]}</Badge>
          <Button render={<Link href={`/admin/festas/${id}/editar`} />} nativeButton={false} variant="outline" size="sm">
            <Pencil className="size-4" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FestaStatusControl festaId={id} status={festa.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {festa.fechada_por && (
                <Info icon={<UserCheck className="size-4" />}>
                  Fechada por: {festa.fechada_por}
                </Info>
              )}
              <Info icon={<Clock className="size-4" />}>
                {formatTime(festa.hora_inicio)} às {formatTime(festa.hora_fim)}
              </Info>
              <Info icon={<MapPin className="size-4" />}>{localFesta(festa)}</Info>
              {festa.contratante_nome && (
                <Info icon={<Users className="size-4" />}>
                  Contratante: {festa.contratante_nome}
                </Info>
              )}
              {festa.telefone_contato && (
                <Info icon={<Phone className="size-4" />}>
                  {formatPhoneNational(festa.telefone_contato)}
                </Info>
              )}
              {(festa.aniversariante_nome || festa.aniversariante_idade != null) && (
                <Info icon={<Cake className="size-4" />}>
                  {festa.aniversariante_nome}
                  {festa.aniversariante_idade != null ? ` · ${festa.aniversariante_idade} anos` : ""}
                  {festa.qtd_criancas != null ? ` · ${festa.qtd_criancas} crianças` : ""}
                </Info>
              )}
              {festa.tema_festa && (
                <Info icon={<PartyPopper className="size-4" />}>
                  Tema: {festa.tema_festa}
                </Info>
              )}
              {festa.qtd_recreadores != null && (
                <Info icon={<Users className="size-4" />}>
                  {festa.qtd_recreadores} recreador(es)/monitor(es)
                </Info>
              )}
              {festa.is_viagem && (
                <Info icon={<Plane className="size-4" />}>Viagem (cachê dobrado)</Info>
              )}
              {carros.length > 0 || festa.party_vehicles.length > 0 ? (
                <Info icon={<Truck className="size-4" />}>
                  {festa.party_vehicles
                    .map((pv) => pv.vehicles)
                    .filter(Boolean)
                    .map((v) => `${VEHICLE_TYPE_LABEL[v!.tipo]} ${v!.apelido}`)
                    .join(", ")}
                </Info>
              ) : null}
              {festa.observacoes && (
                <p className="whitespace-pre-line rounded-md bg-muted px-3 py-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Evento · </span>
                  {festa.observacoes}
                </p>
              )}
              {festa.observacoes_orcamento && (
                <p className="whitespace-pre-line rounded-md bg-muted px-3 py-2 text-muted-foreground">
                  <span className="font-medium text-foreground">Orçamento · </span>
                  {festa.observacoes_orcamento}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">
                Materiais {festaRealizada && "· conferência de devolução"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itensEstoque.length === 0 && materiais.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Cadastre itens em Estoque para levar às festas.
                </p>
              ) : (
                <MateriaisFesta
                  partyId={id}
                  realizada={festaRealizada}
                  materiais={materiais}
                  itens={itensEstoque}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {festa.valor_festa != null && (
                <div className="flex items-baseline justify-between rounded-lg border border-verde/40 bg-verde/5 px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Valor da festa
                  </span>
                  <span className="font-display text-xl font-extrabold text-verde-escuro">
                    {formatBRL(festa.valor_festa)}
                  </span>
                </div>
              )}
              <GerarOrcamento
                festaId={id}
                telefone={festa.telefone_contato}
                contratante={festa.contratante_nome}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Contrato do evento</CardTitle>
            </CardHeader>
            <CardContent>
              <ContratoFesta
                festaId={id}
                temAnexo={festa.orcamento_assinado_path !== null}
                telefone={festa.telefone_contato}
                contratante={festa.contratante_nome}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-display text-base">
                Equipe ({confirmados}/{assignments.length} confirmados)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Ninguém escalado ainda.
                </p>
              ) : (
                assignments.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {a.profiles?.nome_tio || a.profiles?.nome_completo || "Colaborador"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {a.profiles && (
                          <Badge variant="secondary" className="text-xs">
                            {CARGO_LABEL[a.profiles.cargo]}
                          </Badge>
                        )}
                        {a.presence_mode && (
                          <span>
                            {PRESENCE_MODE_LABEL[a.presence_mode]}
                            {a.horario_apresentacao
                              ? ` ${formatTime(a.horario_apresentacao)}`
                              : ""}
                          </span>
                        )}
                        {a.is_driver && <span>· motorista</span>}
                        {a.cache_final != null && (
                          <span className="font-medium text-verde-escuro">
                            {formatBRL(a.cache_final)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {statusBadge(a.status)}
                      <RemoverEscalado assignmentId={a.id} partyId={id} />
                    </div>
                    {a.status === "pendente" && (
                      <div className="col-span-2">
                      <ConviteLink
                        assignmentId={a.id}
                        partyId={id}
                        // Nome real: este vai na mensagem que o colaborador
                        // recebe. O nome de tio é só para a gestão se achar.
                        nome={a.profiles?.nome_completo || a.profiles?.nome_tio || "Colaborador"}
                        celular={a.profiles?.celular ?? null}
                        data={festa.data}
                        links={a.colaborador_links}
                      />
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Escalar colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              {eligible.length === 0 && assignments.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-6" />}
                  title="Nenhum colaborador aprovado"
                  description="Aprove colaboradores em Colaboradores para poder escalá-los."
                />
              ) : (
                <EscalarPanel festaId={id} carros={carros} eligible={eligible} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
