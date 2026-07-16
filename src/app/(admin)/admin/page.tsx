import type { Metadata } from "next";
import Link from "next/link";
import {
  PartyPopper,
  Users,
  UserPlus,
  Bell,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  MapPin,
  TrendingUp,
  Car,
  ChevronRight
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TZ, todayISO, formatTime, addDaysISO, weekday, DIAS_SEMANA, mondayOfWeek } from "@/lib/utils/date";
import type { PartyStatus, AssignmentStatus, VehicleType } from "@/types/domain";
import { PARTY_STATUS_LABEL } from "@/types/domain";

export const metadata: Metadata = { title: "Início" };

interface TodayParty {
  id: string;
  status: PartyStatus;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  is_viagem: boolean;
  contratante_nome: string | null;
  aniversariante_nome: string | null;
  aniversariante_idade: number | null;
  logradouro: string | null;
  numero: string | null;
  cidade: string | null;
  uf: string | null;
  party_types: { nome: string } | null;
  partners: { nome: string; cidade: string | null; uf: string | null } | null;
  party_vehicles: {
    vehicles: { id: string; apelido: string; tipo: VehicleType; placa: string | null; dia_rodizio: number | null } | null;
  }[];
  party_assignments: {
    id: string;
    status: AssignmentStatus;
    user_id: string;
    profiles: { nome_tio: string | null; nome_completo: string | null } | null;
  }[];
}

function getInitials(name: string) {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function AdminHome() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const weekdayIndex = weekday(today);

  // 1. Fetch today's parties with related assignments and vehicles
  const { data: todayPartiesRaw } = await supabase
    .from("parties")
    .select(`
      id,
      status,
      data,
      hora_inicio,
      hora_fim,
      is_viagem,
      contratante_nome,
      aniversariante_nome,
      aniversariante_idade,
      logradouro,
      numero,
      cidade,
      uf,
      party_types ( nome ),
      partners ( nome, cidade, uf ),
      party_vehicles (
        vehicles ( id, apelido, tipo, placa, dia_rodizio )
      ),
      party_assignments (
        id,
        status,
        user_id,
        profiles ( nome_tio, nome_completo )
      )
    `)
    .eq("data", today)
    .order("hora_inicio", { ascending: true });

  const todayParties = (todayPartiesRaw || []) as unknown as TodayParty[];

  // Calculate live parties (Em andamento)
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const currentTime = formatter.format(now);

  const activePartiesCount = todayParties.filter(p => {
    if (p.status === "cancelada" || p.status === "fechada") return false;
    return currentTime >= p.hora_inicio && currentTime <= p.hora_fim;
  }).length;

  const totalPartiesToday = todayParties.length;
  const confirmedPartiesToday = todayParties.filter(
    p => p.status === "confirmada" || p.status === "realizada" || p.status === "paga"
  ).length;

  // 2. Fetch pending assignments for today and future parties
  const { data: pendingAssoc } = await supabase
    .from("party_assignments")
    .select("id, status, party_id, parties ( data )")
    .eq("status", "pendente");

  const pendingAssignmentsCount = pendingAssoc
    ? pendingAssoc.filter(a => a.parties && (a.parties as any).data >= today).length
    : 0;

  // 3. Fetch count of pending collaborator profiles awaiting approval
  const { count: pendentesCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "colaborador")
    .eq("aprovado", false);

  // 4. Fetch tomorrow's parties for unconfirmed assignments alert
  const { data: tomorrowPartiesRaw } = await supabase
    .from("parties")
    .select(`
      id,
      party_assignments ( status )
    `)
    .eq("data", tomorrow);

  let unconfirmedTomorrowCount = 0;
  tomorrowPartiesRaw?.forEach(p => {
    p.party_assignments?.forEach(a => {
      if (a.status === "pendente") {
        unconfirmedTomorrowCount++;
      }
    });
  });

  // 5. Fetch low stock items alert (items where quantity_total <= 2)
  const { data: lowStockItems } = await supabase
    .from("stock_items")
    .select("nome, quantidade_total")
    .eq("ativo", true)
    .lte("quantidade_total", 2)
    .order("quantidade_total", { ascending: true })
    .limit(3);

  // 6. Weekly statistics (from Monday to Sunday of this week)
  const monday = mondayOfWeek(today);
  const sunday = addDaysISO(monday, 6);
  const { data: weekParties } = await supabase
    .from("parties")
    .select(`
      id,
      status,
      data,
      party_assignments ( status )
    `)
    .gte("data", monday)
    .lte("data", sunday);

  const weekConfirmed = weekParties?.filter(
    p => p.status === "confirmada" || p.status === "realizada" || p.status === "paga"
  ).length ?? 0;

  const { count: activeColabs } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "colaborador")
    .eq("aprovado", true)
    .eq("ativo", true);

  const { count: availableVehicles } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("status", "disponivel");

  let totalWeekAssignments = 0;
  let confirmedWeekAssignments = 0;
  weekParties?.forEach(p => {
    if (p.status === "cancelada") return;
    p.party_assignments?.forEach(a => {
      totalWeekAssignments++;
      if (a.status === "confirmada") {
        confirmedWeekAssignments++;
      }
    });
  });
  const confirmationRate = totalWeekAssignments > 0
    ? Math.round((confirmedWeekAssignments / totalWeekAssignments) * 100)
    : 100;

  // Construct dynamic alerts list
  const alerts: { type: "info" | "warning" | "error"; text: string }[] = [];

  // Rodízio alerts
  todayParties.forEach(p => {
    p.party_vehicles?.forEach(pv => {
      const v = pv.vehicles;
      if (v && v.dia_rodizio === weekdayIndex) {
        const weekdayName = DIAS_SEMANA[weekdayIndex];
        alerts.push({
          type: "warning",
          text: `Veículo ${v.apelido} (${v.placa ?? ""}) está em rodízio hoje (${weekdayName}).`,
        });
      }
    });
  });

  // Unconfirmed tomorrow alert
  if (unconfirmedTomorrowCount > 0) {
    alerts.push({
      type: "error",
      text: `${unconfirmedTomorrowCount} colaborador${unconfirmedTomorrowCount > 1 ? "es ainda não confirmaram" : " ainda não confirmou"} festa${unconfirmedTomorrowCount > 1 ? "s" : ""} de amanhã.`,
    });
  }

  // Low stock alerts
  lowStockItems?.forEach(item => {
    alerts.push({
      type: "info",
      text: `Material '${item.nome}' tem estoque baixo (${item.quantidade_total} disponível).`,
    });
  });

  const stats = [
    {
      label: "Festas Hoje",
      value: totalPartiesToday,
      subtext: totalPartiesToday === 0
        ? "Nenhuma festa hoje"
        : totalPartiesToday === 1
        ? "1 festa programada"
        : `${confirmedPartiesToday} de ${totalPartiesToday} confirmadas`,
      icon: Calendar,
      href: "/admin/festas",
      accent: "text-verde bg-verde/10",
    },
    {
      label: "Em Andamento",
      value: activePartiesCount,
      subtext: activePartiesCount === 1 ? "1 festa ao vivo agora" : `${activePartiesCount} ao vivo agora`,
      icon: Clock,
      href: "/admin/festas",
      accent: "text-laranja bg-laranja/10",
    },
    {
      label: "Pendentes",
      value: pendingAssignmentsCount,
      subtext: "Aguardando confirmação",
      icon: AlertTriangle,
      href: "/admin/festas",
      accent: "text-vermelho bg-vermelho/10",
    },
    {
      label: "Cadastros Pendentes",
      value: pendentesCount ?? 0,
      subtext: "Aguardando aprovação",
      icon: UserPlus,
      href: "/admin/colaboradores",
      accent: "text-amarelo bg-amarelo/10",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${profile.nome_completo?.split(" ")[0] ?? "equipe"}`}
        description={
          totalPartiesToday === 0
            ? "Bom dia! Nenhuma festa agendada para hoje."
            : totalPartiesToday === 1
            ? "Bom dia! Você tem 1 evento hoje."
            : `Bom dia! Você tem ${totalPartiesToday} eventos hoje.`
        }
        action={
          <Button
            render={<Link href="/admin/festas/nova" />}
            className="bg-verde font-semibold text-white hover:bg-verde-escuro shadow-sm cursor-pointer transition-colors"
          >
            <Plus className="size-4" /> Novo evento
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="block group">
              <Card className="transition-all hover:shadow-md hover:border-foreground/20 group-hover:-translate-y-0.5 duration-200">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{s.label}</p>
                    <p className="font-display text-3xl font-extrabold tabular text-foreground">
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.subtext}</p>
                  </div>
                  <div className={`flex size-12 items-center justify-center rounded-xl ${s.accent} transition-transform group-hover:scale-105 duration-200`}>
                    <Icon className="size-6 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Main Dashboard Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Left Side: Today's Parties */}
        <div className="space-y-4">
          <Card className="border border-border">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <PartyPopper className="size-5 text-verde" />
                Festas de hoje
              </h2>
              <Link
                href="/admin/festas"
                className="text-xs font-semibold text-verde hover:text-verde-escuro flex items-center gap-0.5 hover:underline transition-all"
              >
                Ver todas as festas
                <ChevronRight className="size-3" />
              </Link>
            </div>
            <CardContent className="p-6">
              {todayParties.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Calendar className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Tudo tranquilo por aqui</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Não há festas agendadas para o dia de hoje.</p>
                  </div>
                  <Button
                    render={<Link href="/admin/festas/nova" />}
                    size="sm"
                    className="bg-verde text-white hover:bg-verde-escuro font-semibold mt-2 cursor-pointer"
                  >
                    Cadastrar Festa
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayParties.map((party) => {
                    const statusColors: Record<PartyStatus, string> = {
                      fechada: "bg-muted text-muted-foreground",
                      escalada: "bg-laranja/15 text-laranja-escuro",
                      confirmada: "bg-verde/15 text-verde-escuro",
                      realizada: "bg-emerald-800/15 text-emerald-800",
                      paga: "bg-amarelo/15 text-yellow-800",
                      cancelada: "bg-vermelho/10 text-vermelho",
                    };

                    const partyDetails = [
                      party.party_types?.nome,
                      party.aniversariante_nome && `Níver: ${party.aniversariante_nome}${party.aniversariante_idade ? ` (${party.aniversariante_idade} anos)` : ""}`,
                    ].filter(Boolean).join(" · ");

                    const locationStr = party.partners?.nome
                      ? party.partners.nome
                      : party.cidade
                      ? `${party.logradouro ?? ""}, ${party.numero ?? ""}`.trim() || party.cidade
                      : "Local não definido";

                    // Confirmed team names
                    const team = party.party_assignments || [];

                    // Vehicle names
                    const vehicles = party.party_vehicles || [];

                    return (
                      <Link
                        key={party.id}
                        href={`/admin/festas/${party.id}`}
                        className="group block border border-border rounded-xl p-4 hover:border-foreground/20 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {/* Time Badge */}
                            <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-verde text-white font-mono font-bold leading-none shadow-sm group-hover:scale-105 transition-transform duration-200">
                              <span className="text-sm">{formatTime(party.hora_inicio).split(":")[0]}h</span>
                              <span className="text-xs opacity-80 mt-0.5">{formatTime(party.hora_inicio).split(":")[1] || "00"}</span>
                            </div>

                            {/* Party Info */}
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-display font-bold text-base text-foreground group-hover:text-verde transition-colors">
                                  {party.contratante_nome ?? "Contratante sem nome"}
                                </h3>
                                <Badge className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[party.status]}`}>
                                  {PARTY_STATUS_LABEL[party.status]}
                                </Badge>
                                {party.is_viagem && (
                                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs py-0.5">
                                    Viagem
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{partyDetails}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="size-3 shrink-0" />
                                <span className="truncate">{locationStr}</span>
                              </p>
                            </div>
                          </div>

                          {/* Team and Logistic Badges */}
                          <div className="flex flex-col sm:items-end justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-dashed border-border">
                            {/* Collaborator Avatars/Initials */}
                            {team.length > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase mr-1">Equipe:</span>
                                <div className="flex flex-wrap gap-1">
                                  {team.map((a) => {
                                    const name = a.profiles?.nome_tio || a.profiles?.nome_completo || "";
                                    const isConfirmed = a.status === "confirmada";
                                    return (
                                      <div
                                        key={a.id}
                                        className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          isConfirmed
                                            ? "bg-verde/15 text-verde-escuro border border-verde/20"
                                            : "bg-muted text-muted-foreground/60 border border-border"
                                        }`}
                                        title={`${name} (${a.status})`}
                                      >
                                        {getInitials(name)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 font-medium">Sem colaboradores escalados</span>
                            )}

                            {/* Vehicles badges */}
                            {vehicles.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Car className="size-3 text-laranja shrink-0" />
                                <span className="truncate max-w-[150px]">
                                  {vehicles.map((v) => v.vehicles?.apelido).filter(Boolean).join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Alerts & Summary */}
        <div className="space-y-6">
          {/* Alerts Widget */}
          <Card className="border border-border">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Bell className="size-4 text-laranja shrink-0" />
                Alertas da Operação
              </h3>
            </div>
            <CardContent className="p-4">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-verde/5 border border-verde/10 p-4">
                  <CheckCircle2 className="size-5 text-verde shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-verde-escuro">Tudo sob controle!</p>
                    <p className="text-muted-foreground/80 mt-0.5">Nenhum alerta pendente para hoje.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((a, idx) => {
                    const isError = a.type === "error";
                    const isWarning = a.type === "warning";

                    let cardClass = "bg-amarelo/10 border-amarelo/20 text-yellow-800";
                    let iconClass = "text-yellow-600";
                    if (isError) {
                      cardClass = "bg-vermelho/5 border border-vermelho/20 text-vermelho";
                      iconClass = "text-vermelho";
                    } else if (isWarning) {
                      cardClass = "bg-laranja/10 border border-laranja/20 text-laranja-escuro";
                      iconClass = "text-laranja";
                    }

                    return (
                      <div key={idx} className={`flex items-start gap-2.5 rounded-lg p-3 text-xs border ${cardClass}`}>
                        <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${iconClass}`} />
                        <span className="font-medium leading-relaxed">{a.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Summary Widget */}
          <Card className="border border-border">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Resumo da Semana
              </h3>
            </div>
            <CardContent className="p-5">
              <ul className="space-y-4">
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5 text-muted-foreground">
                    <CheckCircle2 className="size-4 text-verde shrink-0" />
                    Festas confirmadas
                  </span>
                  <span className="font-semibold text-foreground">{weekConfirmed}</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5 text-muted-foreground">
                    <Users className="size-4 text-laranja shrink-0" />
                    Colaboradores ativos
                  </span>
                  <span className="font-semibold text-foreground">{activeColabs}</span>
                </li>
                <li className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5 text-muted-foreground">
                    <Car className="size-4 text-sky-500 shrink-0" />
                    Veículos disponíveis
                  </span>
                  <span className="font-semibold text-foreground">{availableVehicles}</span>
                </li>
                <li className="flex items-center justify-between text-sm border-t border-border pt-3 border-dashed">
                  <span className="flex items-center gap-2.5 text-muted-foreground">
                    <TrendingUp className="size-4 text-amarelo shrink-0" />
                    Taxa de confirmação
                  </span>
                  <span className="font-display font-extrabold text-base text-foreground">
                    {confirmationRate}%
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
