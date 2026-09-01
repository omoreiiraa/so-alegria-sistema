import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Printer, Calendar, MapPin, Clock, Users, Car, FileText } from "lucide-react";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/admin/print-button";
import { TZ, todayISO, formatTime, formatDateLong, weekday } from "@/lib/utils/date";
import type { PartyStatus, AssignmentStatus, VehicleType, PresenceMode } from "@/types/domain";

export const metadata: Metadata = { title: "Folha do Dia" };

interface PrintableParty {
  id: string;
  status: PartyStatus;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  contratante_nome: string | null;
  aniversariante_nome: string | null;
  aniversariante_idade: number | null;
  qtd_criancas: number | null;
  observacoes: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  is_viagem: boolean;
  party_types: { nome: string } | null;
  partners: {
    nome: string;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
  } | null;
  party_vehicles: {
    vehicles: { id: string; apelido: string; tipo: VehicleType; placa: string | null } | null;
  }[];
  party_assignments: {
    id: string;
    status: AssignmentStatus;
    presence_mode: PresenceMode | null;
    horario_apresentacao: string | null;
    profiles: { nome_completo: string | null; nome_tio: string | null } | null;
  }[];
  party_party_types: {
    party_types: { nome: string } | null;
  }[];
}

export default async function FolhaDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  await requireEquipe();
  const { data: dateParam } = await searchParams;
  const targetDate = dateParam || todayISO();
  const supabase = await createClient();

  // Fetch parties for targetDate
  const { data: partiesRaw } = await supabase
    .from("parties")
    .select(`
      id,
      status,
      data,
      hora_inicio,
      hora_fim,
      contratante_nome,
      aniversariante_nome,
      aniversariante_idade,
      qtd_criancas,
      observacoes,
      logradouro,
      numero,
      bairro,
      cidade,
      uf,
      is_viagem,
      party_types ( nome ),
      partners ( nome, logradouro, numero, bairro, cidade, uf ),
      party_vehicles (
        vehicles ( id, apelido, tipo, placa )
      ),
      party_assignments (
        id,
        status,
        presence_mode,
        horario_apresentacao,
        profiles ( nome_completo, nome_tio )
      ),
      party_party_types (
        party_types ( nome )
      )
    `)
    .eq("data", targetDate)
    .order("hora_inicio", { ascending: true });

  const parties = (partiesRaw || []) as unknown as PrintableParty[];

  return (
    <div className="space-y-6">
      {/* Dynamic print-only style to override layouts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide standard elements */
          header, aside, footer, nav, button, form, .no-print {
            display: none !important;
          }
          /* Expand main container to cover full page width */
          main, .print-full {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-size: 8.5pt !important;
            line-height: 1.2 !important;
          }
          /* Ensure cards avoid breaking across page breaks and are tight */
          .print-card {
            border: 1px solid #000 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 8px !important;
            padding: 8px 12px !important;
            border-radius: 4px !important;
            background: transparent !important;
            box-shadow: none !important;
            max-height: 5.2cm !important;
          }
          .print-card [data-slot=card-content] {
            padding: 0 !important;
          }
          .print-card p, .print-card li, .print-card span {
            font-size: 8.5pt !important;
            line-height: 1.25 !important;
            margin-bottom: 2px !important;
          }
          .print-card h2 {
            font-size: 10pt !important;
            margin-bottom: 3px !important;
            font-weight: 800 !important;
            line-height: 1.1 !important;
          }
          .print-card h3 {
            font-size: 9pt !important;
            margin-bottom: 3px !important;
            font-weight: 700 !important;
            line-height: 1.1 !important;
          }
          .print-card .grid {
            gap: 16px !important;
          }
          .print-card ul {
            margin-top: 2px !important;
          }
        }
      `}} />

      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5 no-print">
        <div className="flex items-center gap-3">
          <Button
            render={<Link href="/admin" />} nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Folha do Dia
            </h1>
            <p className="text-sm text-muted-foreground">
              Gere a folha de impressão das festas por data.
            </p>
          </div>
        </div>

        {/* Date Filter & Print */}
        <div className="flex flex-wrap items-center gap-3">
          <form method="GET" className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                name="data"
                defaultValue={targetDate}
                className="flex h-9 w-40 rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="bg-laranja hover:bg-laranja-escuro text-white font-semibold cursor-pointer"
            >
              Filtrar
            </Button>
          </form>
          {parties.length > 0 && <PrintButton />}
        </div>
      </div>

      {/* Party Sheets List */}
      <div className="print-full space-y-6">
        {parties.length === 0 ? (
          <Card className="no-print">
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <FileText className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">Nenhuma festa nesta data</p>
                <p className="text-xs text-muted-foreground mt-0.5">Selecione outro dia ou cadastre novas festas.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header info in print layout */}
            <div className="hidden print:block border-b border-black pb-3 mb-6">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold tracking-tight text-black uppercase">
                  Só Alegria · Recreação e Discoteca
                </h1>
                <span className="text-sm font-bold text-black uppercase">
                  FOLHA DO DIA: {formatDateLong(targetDate)}
                </span>
              </div>
            </div>

            {parties.map((party, index) => {
              const festaIndex = index + 1;

              // Formatting party types
              const partyTypesStr = party.party_party_types && party.party_party_types.length > 0
                ? party.party_party_types.map(pt => pt.party_types?.nome).filter(Boolean).join(" + ")
                : party.party_types?.nome ?? "Festa";

              // Formatting Address
              const addressStr = party.partners?.nome
                ? `${party.partners.nome} - ${[
                    party.partners.logradouro && `${party.partners.logradouro}${party.partners.numero ? `, ${party.partners.numero}` : ""}`,
                    party.partners.bairro,
                    party.partners.cidade && `${party.partners.cidade}/${party.partners.uf ?? ""}`
                  ].filter(Boolean).join(" · ")}`
                : [
                    party.logradouro && `${party.logradouro}${party.numero ? `, ${party.numero}` : ""}`,
                    party.bairro,
                    party.cidade && `${party.cidade}/${party.uf ?? ""}`
                  ].filter(Boolean).join(" · ") || "Local a definir";

              // Formatting Vehicles
              const vehiclesStr = party.party_vehicles && party.party_vehicles.length > 0
                ? party.party_vehicles.map(v => `${v.vehicles?.apelido}${v.vehicles?.placa ? ` (${v.vehicles.placa})` : ""}`).join(", ")
                : "Nenhum veículo escalado";

              // Formatting assignments
              const team = party.party_assignments || [];

              return (
                <Card key={party.id} className="print-card border border-border overflow-hidden">
                  <CardContent className="p-6">
                    <div className="grid gap-6 print:gap-8 grid-cols-1 md:grid-cols-2 print:grid-cols-2">
                      {/* Left Side: Party Details */}
                      <div className="space-y-2 border-r-0 md:border-r print:border-r border-dashed border-border pr-0 md:pr-6 print:pr-6 text-left">
                        <div className="border-b border-border pb-1.5 mb-3">
                          <h2 className="font-display text-lg font-black text-verde uppercase print:text-black">
                            FESTA {festaIndex}
                          </h2>
                        </div>
                        <p className="text-sm">
                          <strong className="uppercase">TIPO DO EVENTO:</strong> {partyTypesStr}
                        </p>
                        <p className="text-sm">
                          <strong className="uppercase">HORARIO DA FESTA:</strong> {formatTime(party.hora_inicio)} às {formatTime(party.hora_fim)}
                        </p>
                        <p className="text-sm">
                          <strong className="uppercase">CLIENTE:</strong> {party.contratante_nome ?? "Não informado"}
                        </p>
                        {party.aniversariante_nome && (
                          <p className="text-sm">
                            <strong className="uppercase">ANIVERSARIANTE:</strong> {party.aniversariante_nome} {party.aniversariante_idade ? `(idade: ${party.aniversariante_idade} anos)` : ""}
                          </p>
                        )}
                        <p className="text-sm">
                          <strong className="uppercase">CONVIDADOS:</strong> {party.qtd_criancas ?? "0"} CRIANÇAS
                        </p>
                        <p className="text-sm leading-relaxed">
                          <strong className="uppercase">ENDEREÇO:</strong> {addressStr}
                        </p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          <strong className="uppercase">OBS:</strong> {party.observacoes || "Nenhuma observação cadastrada."}
                        </p>
                      </div>

                      {/* Right Side: Logistics */}
                      <div className="space-y-4 text-left flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="border-b border-border pb-1.5 mb-3">
                            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground print:text-black">
                              Logística e Escala
                            </h3>
                          </div>
                          <p className="text-sm">
                            <strong className="uppercase">VEÍCULO:</strong> {vehiclesStr}
                          </p>
                          <div className="space-y-1.5">
                            <strong className="text-sm uppercase block">RECREADORES ESCALADOS:</strong>
                            {team.length === 0 ? (
                              <p className="text-xs text-amber-600 font-medium">Nenhum recreador escalado para esta festa.</p>
                            ) : (
                              <ul className="space-y-2">
                                {team.map((a) => {
                                  const realName = a.profiles?.nome_completo || a.profiles?.nome_tio || "Colaborador";
                                  const mode = a.presence_mode === "na_empresa" ? "Na Empresa" : "Direto no Local";
                                  return (
                                    <li key={a.id} className="text-sm flex flex-col">
                                      <span className="font-semibold text-foreground print:text-black">
                                        • {realName}
                                      </span>
                                      {a.horario_apresentacao && (
                                        <span className="text-xs text-muted-foreground print:text-black pl-3 font-mono">
                                          ({mode}: {formatTime(a.horario_apresentacao)})
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Extra print helper footer inside card */}
                        <div className="hidden print:block border-t border-dashed border-border pt-3 mt-4 text-[10px] text-muted-foreground">
                          Impresso via Sistema Só Alegria · Status da festa: {party.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
