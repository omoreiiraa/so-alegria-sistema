import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { FestasView, type FestaCard } from "@/components/admin/festas-view";
import type { PartyStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Festas" };

type Row = {
  id: string;
  status: PartyStatus;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  is_viagem: boolean;
  contratante_nome: string | null;
  cidade: string | null;
  uf: string | null;
  party_types: { nome: string } | null;
  partners: { nome: string } | null;
  party_assignments: { status: string }[];
  party_party_types: { party_types: { nome: string } | null }[];
};

export default async function FestasPage() {
  await requireEquipe();
  const supabase = await createClient();
  const { data } = await supabase
    .from("parties")
    .select(
      `id, status, data, hora_inicio, hora_fim, is_viagem, contratante_nome, cidade, uf,
       party_types ( nome ), partners ( nome ), party_assignments ( status ),
       party_party_types ( party_types ( nome ) )`,
    )
    .order("data", { ascending: true });

  const rows = (data ?? []) as unknown as Row[];
  const festas: FestaCard[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    data: r.data,
    horaInicio: r.hora_inicio,
    horaFim: r.hora_fim,
    isViagem: r.is_viagem,
    contratante: r.contratante_nome,
    tipo: r.party_party_types && r.party_party_types.length > 0
      ? r.party_party_types.map((pt) => pt.party_types?.nome).filter(Boolean).join(" + ")
      : r.party_types?.nome ?? null,
    local: r.partners?.nome ?? (r.cidade ? `${r.cidade}/${r.uf ?? ""}` : ""),
    total: r.party_assignments.length,
    confirmados: r.party_assignments.filter((a) => a.status === "confirmada").length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Festas"
        description="Gerencie as festas por status ou pelo calendário."
        action={
          <Button
            render={<Link href="/admin/festas/nova" />} nativeButton={false}
            className="bg-verde font-semibold text-white hover:bg-verde-escuro"
          >
            <Plus className="size-4" /> Nova festa
          </Button>
        }
      />
      <FestasView festas={festas} />
    </div>
  );
}
