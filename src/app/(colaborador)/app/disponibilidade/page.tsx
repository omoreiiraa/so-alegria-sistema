import type { Metadata } from "next";
import { requireColaborador } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { DisponibilidadeCalendar } from "@/components/colaborador/disponibilidade-calendar";

export const metadata: Metadata = { title: "Disponibilidade" };

export default async function DisponibilidadePage() {
  const { userId } = await requireColaborador();
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability")
    .select("data")
    .eq("user_id", userId);

  const initial = (data ?? []).map((r) => r.data);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Disponibilidade"
        description="Toque nos dias em que você pode trabalhar."
      />
      <DisponibilidadeCalendar initial={initial} />
      <p className="px-1 text-xs text-muted-foreground">
        Os dias marcados ficam visíveis para o escritório na hora de montar a
        escala. Você pode alterar quando quiser.
      </p>
    </div>
  );
}
