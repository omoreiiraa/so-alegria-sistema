import type { Metadata } from "next";
import { CalendarCheck2 } from "lucide-react";
import { requireColaborador } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Disponibilidade" };

export default async function DisponibilidadePage() {
  await requireColaborador();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Disponibilidade"
        description="Marque os dias em que você pode trabalhar."
      />
      <EmptyState
        icon={<CalendarCheck2 className="size-6" />}
        title="Calendário em construção"
        description="Em breve você marca aqui os dias livres, e o escritório usa isso para te escalar."
      />
    </div>
  );
}
