import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Link2, PartyPopper } from "lucide-react";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColaboradorActions } from "@/components/admin/colaborador-actions";
import { EditarColaborador } from "@/components/admin/editar-colaborador";
import { ExcluirColaborador } from "@/components/admin/excluir-colaborador";
import { LinkCadastro, type LinkRow } from "@/components/admin/link-cadastro";
import { formatPhoneNational } from "@/lib/utils/phone";
import { formatCPF } from "@/lib/utils/cpf";
import { formatCNPJ } from "@/lib/utils/cnpj";
import { formatRG } from "@/lib/utils/rg";
import { formatCEP } from "@/lib/utils/cep";
import { formatDate } from "@/lib/utils/date";
import { formatBRL } from "@/lib/utils/money";
import {
  CARGO_LABEL,
  CARGO_BASE,
  ASSIGNMENT_STATUS_LABEL,
  PARTY_STATUS_LABEL,
} from "@/types/domain";
import type { AssignmentStatus, CargoType, PartyStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Colaborador" };

type Perfil = {
  id: string;
  nome_completo: string | null;
  nome_tio: string | null;
  rg: string | null;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  celular: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  chave_pix: string | null;
  cargo: CargoType;
  aprovado: boolean;
  ativo: boolean;
  created_at: string;
  colaborador_links: (LinkRow & { tipo: "cadastro" | "convite" })[];
};

type Escala = {
  id: string;
  status: AssignmentStatus;
  cache_final: number | null;
  parties: { id: string; data: string; status: PartyStatus; contratante_nome: string | null } | null;
};

export default async function ColaboradorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireEquipe();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: perfilData }, { data: escalaData }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `id, nome_completo, nome_tio, rg, cpf, cnpj, email, celular, cep, logradouro, numero,
         complemento, bairro, cidade, uf, chave_pix, cargo, aprovado, ativo, created_at,
         colaborador_links ( id, tipo, usado_em, revogado_em, created_at )`,
      )
      .eq("id", id)
      .eq("role", "colaborador")
      .single(),
    supabase
      .from("party_assignments")
      .select("id, status, cache_final, parties ( id, data, status, contratante_nome )")
      .eq("profile_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!perfilData) notFound();
  const p = perfilData as unknown as Perfil;
  const escalas = (escalaData ?? []) as unknown as Escala[];

  const cadastroPreenchido = p.cpf !== null;
  const linksCadastro = p.colaborador_links.filter((l) => l.tipo === "cadastro");
  const nome = p.nome_completo ?? p.nome_tio ?? "Colaborador";

  const endereco = [
    [p.logradouro, p.numero].filter(Boolean).join(", "),
    p.complemento,
    p.bairro,
    [p.cidade, p.uf].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            render={<Link href="/admin/colaboradores" />} nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {nome}
              {p.nome_tio && p.nome_completo && (
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  ({p.nome_tio})
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              Na equipe desde {formatDate(p.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!p.ativo && <Badge variant="secondary">Inativo</Badge>}
          {!cadastroPreenchido && (
            <Badge className="bg-laranja/15 text-laranja-escuro">Cadastro pendente</Badge>
          )}
          {p.aprovado ? (
            <Badge variant="secondary">
              {CARGO_LABEL[p.cargo]} · base {formatBRL(CARGO_BASE[p.cargo] ?? 0)}
            </Badge>
          ) : (
            <Badge className="bg-vermelho/10 text-vermelho">Não aprovado</Badge>
          )}
          <EditarColaborador
            profileId={p.id}
            ficha={{
              nome_completo: p.nome_completo,
              nome_tio: p.nome_tio,
              rg: p.rg,
              cpf: p.cpf,
              cnpj: p.cnpj,
              email: p.email,
              celular: p.celular,
              cep: p.cep,
              logradouro: p.logradouro,
              numero: p.numero,
              complemento: p.complemento,
              bairro: p.bairro,
              cidade: p.cidade,
              uf: p.uf,
              chave_pix: p.chave_pix,
            }}
          />
          <ColaboradorActions
            profileId={p.id}
            aprovado={p.aprovado}
            ativo={p.ativo}
            cargo={p.cargo}
            nomeTio={p.nome_tio}
          />
          <ExcluirColaborador profileId={p.id} nome={nome} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Dados pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Campo label="Nome completo" valor={p.nome_completo} />
              <Campo label="Nome de tio" valor={p.nome_tio} />
              <Campo label="RG" valor={p.rg ? formatRG(p.rg) : null} />
              <Campo label="CPF" valor={p.cpf ? formatCPF(p.cpf) : null} />
              <Campo label="CNPJ" valor={p.cnpj ? formatCNPJ(p.cnpj) : null} />
              <Campo label="E-mail" valor={p.email} />
              <Campo label="Celular" valor={p.celular ? formatPhoneNational(p.celular) : null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Campo label="CEP" valor={p.cep ? formatCEP(p.cep) : null} />
              <Campo label="Endereço" valor={endereco || null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <Campo label="Chave PIX" valor={p.chave_pix} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Link2 className="size-4" /> Link de cadastro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LinkCadastro
                profileId={p.id}
                nome={nome}
                celular={p.celular}
                cadastroPreenchido={cadastroPreenchido}
                links={linksCadastro}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <PartyPopper className="size-4" /> Festas ({escalas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {escalas.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nunca foi escalado.
                </p>
              ) : (
                escalas.map((e) => (
                  <Link
                    key={e.id}
                    href={e.parties ? `/admin/festas/${e.parties.id}` : "#"}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {e.parties?.contratante_nome ?? "Festa"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.parties ? formatDate(e.parties.data) : ""}
                        {e.parties ? ` · ${PARTY_STATUS_LABEL[e.parties.status]}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {e.cache_final != null && (
                        <span className="text-xs font-medium text-verde-escuro">
                          {formatBRL(e.cache_final)}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {ASSIGNMENT_STATUS_LABEL[e.status]}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={valor ? "font-medium" : "text-muted-foreground/60"}>
        {valor ?? "—"}
      </span>
    </div>
  );
}
