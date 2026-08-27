import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { PagamentosAdmin, type PagamentoRow } from "@/components/admin/pagamentos-admin";
import { mondayOfWeek, addDaysISO, todayISO } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Pagamentos" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminPagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  await requireAdmin();
  const { semana } = await searchParams;
  const semanaInicio = mondayOfWeek(semana && ISO.test(semana) ? semana : todayISO());
  const semanaFim = addDaysISO(semanaInicio, 6);

  const supabase = await createClient();

  const { data: week } = await supabase
    .from("payment_weeks")
    .select("id")
    .eq("semana_inicio", semanaInicio)
    .maybeSingle();

  let payments: {
    id: string;
    valor_total: number;
    qtd_festas: number;
    status: "aberto" | "pago";
    pago_em: string | null;
    profile_id: string;
    profiles: { nome_completo: string | null; nome_tio: string | null; chave_pix: string | null } | null;
  }[] = [];

  if (week) {
    const { data } = await supabase
      .from("payments")
      .select(
        "id, valor_total, qtd_festas, status, pago_em, profile_id, profiles ( nome_completo, nome_tio, chave_pix )",
      )
      .eq("payment_week_id", week.id);
    payments = (data ?? []) as unknown as typeof payments;
  }

  let rows: PagamentoRow[];

  if (payments.length > 0) {
    rows = payments.map((p) => ({
      paymentId: p.id,
      userId: p.profile_id,
      nome: p.profiles?.nome_completo ?? "Colaborador",
      nomeTio: p.profiles?.nome_tio ?? null,
      chavePix: p.profiles?.chave_pix ?? null,
      qtd: p.qtd_festas,
      valor: Number(p.valor_total),
      status: p.status,
      pagoEm: p.pago_em,
    }));
  } else {
    // Prévia: agrega assignments confirmados de festas realizadas na semana
    const { data: elig } = await supabase
      .from("party_assignments")
      .select(
        "profile_id, cache_final, profiles ( nome_completo, nome_tio, chave_pix ), parties!inner ( data, status )",
      )
      .eq("status", "confirmada")
      .eq("parties.status", "realizada")
      .gte("parties.data", semanaInicio)
      .lte("parties.data", semanaFim);

    const grp = new Map<string, PagamentoRow>();
    for (const e of (elig ?? []) as unknown as {
      profile_id: string;
      cache_final: number | null;
      profiles: { nome_completo: string | null; nome_tio: string | null; chave_pix: string | null } | null;
    }[]) {
      const cur = grp.get(e.profile_id) ?? {
        paymentId: null,
        userId: e.profile_id,
        nome: e.profiles?.nome_completo ?? "Colaborador",
        nomeTio: e.profiles?.nome_tio ?? null,
        chavePix: e.profiles?.chave_pix ?? null,
        qtd: 0,
        valor: 0,
        status: "previa" as const,
        pagoEm: null,
      };
      cur.qtd += 1;
      cur.valor += Number(e.cache_final ?? 0);
      grp.set(e.profile_id, cur);
    }
    rows = [...grp.values()];
  }

  rows.sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagamentos"
        description="Pagamento toda segunda, referente a seg–dom da semana anterior."
      />
      <PagamentosAdmin
        semanaInicio={semanaInicio}
        semanaFim={semanaFim}
        prevSemana={addDaysISO(semanaInicio, -7)}
        nextSemana={addDaysISO(semanaInicio, 7)}
        fechada={!!week}
        rows={rows}
      />
    </div>
  );
}
