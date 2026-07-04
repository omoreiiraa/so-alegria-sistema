import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { requireColaborador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL } from "@/lib/utils/money";
import { formatDate, mondayOfWeek, addDaysISO } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Pagamentos" };

type Semana = {
  semanaInicio: string;
  semanaFim: string;
  status: "previa" | "aberto" | "pago";
  valor: number;
  pagoEm: string | null;
  festas: { data: string; tipo: string | null; valor: number }[];
};

function statusBadge(s: Semana["status"]) {
  if (s === "pago") return <Badge className="bg-verde/15 text-verde-escuro">Pago</Badge>;
  if (s === "aberto") return <Badge className="bg-laranja/15 text-laranja-escuro">A receber</Badge>;
  return <Badge variant="secondary">Prévia</Badge>;
}

function SemanaCard({ s }: { s: Semana }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {formatDate(s.semanaInicio)} – {formatDate(s.semanaFim)}
            </p>
            {s.pagoEm && (
              <p className="text-xs text-muted-foreground">Pago em {formatDate(s.pagoEm)}</p>
            )}
          </div>
          {statusBadge(s.status)}
        </div>
        <div className="divide-y divide-border">
          {s.festas.map((f, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">
                {formatDate(f.data)} · {f.tipo ?? "Festa"}
              </span>
              <span className="font-medium tabular">{formatBRL(f.valor)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-sm font-semibold">Total</span>
          <span className="font-display text-lg font-extrabold text-verde-escuro tabular">
            {formatBRL(s.valor)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PagamentosPage() {
  const { userId } = await requireColaborador();
  const supabase = await createClient();

  const [{ data: aData }, { data: pData }] = await Promise.all([
    supabase
      .from("party_assignments")
      .select("cache_final, parties!inner ( data, party_types ( nome ) )")
      .eq("user_id", userId)
      .eq("status", "confirmada")
      .eq("parties.status", "realizada"),
    supabase
      .from("payments")
      .select("valor_total, status, pago_em, payment_weeks ( semana_inicio, semana_fim )")
      .eq("user_id", userId),
  ]);

  // agrupa festas por semana
  const semanas = new Map<string, Semana>();
  for (const a of (aData ?? []) as unknown as {
    cache_final: number | null;
    parties: { data: string; party_types: { nome: string } | null } | null;
  }[]) {
    if (!a.parties) continue;
    const wk = mondayOfWeek(a.parties.data);
    const cur =
      semanas.get(wk) ??
      ({
        semanaInicio: wk,
        semanaFim: addDaysISO(wk, 6),
        status: "previa",
        valor: 0,
        pagoEm: null,
        festas: [],
      } as Semana);
    const valor = Number(a.cache_final ?? 0);
    cur.festas.push({ data: a.parties.data, tipo: a.parties.party_types?.nome ?? null, valor });
    cur.valor += valor;
    semanas.set(wk, cur);
  }

  // sobrepõe com pagamentos (fonte da verdade de status/valor)
  for (const p of (pData ?? []) as unknown as {
    valor_total: number;
    status: "aberto" | "pago";
    pago_em: string | null;
    payment_weeks: { semana_inicio: string; semana_fim: string } | null;
  }[]) {
    if (!p.payment_weeks) continue;
    const wk = p.payment_weeks.semana_inicio;
    const cur =
      semanas.get(wk) ??
      ({
        semanaInicio: wk,
        semanaFim: p.payment_weeks.semana_fim,
        status: "previa",
        valor: 0,
        pagoEm: null,
        festas: [],
      } as Semana);
    cur.status = p.status;
    cur.valor = Number(p.valor_total);
    cur.pagoEm = p.pago_em;
    cur.semanaFim = p.payment_weeks.semana_fim;
    semanas.set(wk, cur);
  }

  const todas = [...semanas.values()]
    .filter((s) => s.valor > 0 || s.festas.length > 0)
    .sort((a, b) => b.semanaInicio.localeCompare(a.semanaInicio));

  const receber = todas.filter((s) => s.status !== "pago");
  const recebidos = todas.filter((s) => s.status === "pago");
  const totalReceber = receber.reduce((sum, s) => sum + s.valor, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pagamentos"
        description="Pagamentos toda segunda, referentes a seg–dom da semana anterior."
      />

      <Card className="bg-verde text-white">
        <CardContent className="p-5">
          <p className="text-sm text-white/80">A receber</p>
          <p className="font-display text-3xl font-extrabold tabular">
            {formatBRL(totalReceber)}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="receber">
        <TabsList className="w-full">
          <TabsTrigger value="receber" className="flex-1">
            A receber
          </TabsTrigger>
          <TabsTrigger value="recebidos" className="flex-1">
            Recebidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receber" className="mt-4 space-y-3">
          {receber.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-6" />}
              title="Nada a receber ainda"
              description="Quando você confirmar festas e elas forem realizadas, o valor da semana aparece aqui."
            />
          ) : (
            receber.map((s) => <SemanaCard key={s.semanaInicio} s={s} />)
          )}
        </TabsContent>

        <TabsContent value="recebidos" className="mt-4 space-y-3">
          {recebidos.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-6" />}
              title="Nenhum pagamento recebido"
              description="O histórico de semanas pagas aparece aqui."
            />
          ) : (
            recebidos.map((s) => <SemanaCard key={s.semanaInicio} s={s} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
