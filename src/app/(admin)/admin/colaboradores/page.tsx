import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireEquipe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { NovoColaborador } from "@/components/admin/novo-colaborador";
import {
  ListaColaboradores,
  type ColabRow,
} from "@/components/admin/lista-colaboradores";

export const metadata: Metadata = { title: "Colaboradores" };

export default async function ColaboradoresPage() {
  await requireEquipe();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, nome_completo, nome_tio, email, aprovado, ativo, cidade, uf, cpf, created_at",
    )
    .eq("role", "colaborador")
    .order("created_at", { ascending: false });

  // Sem CPF, o colaborador ainda não abriu o link de cadastro.
  const colaboradores: ColabRow[] = (
    (data ?? []) as (Omit<ColabRow, "cadastro_preenchido"> & {
      cpf: string | null;
    })[]
  ).map((c) => ({ ...c, cadastro_preenchido: c.cpf !== null }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colaboradores"
        description="Clique num colaborador para ver a ficha completa, o link de cadastro e o histórico de festas."
        action={<NovoColaborador />}
      />

      {colaboradores.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Nenhum colaborador ainda"
          description="Clique em “Novo colaborador” para criar a ficha e enviar o link de cadastro."
        />
      ) : (
        <ListaColaboradores colaboradores={colaboradores} />
      )}
    </div>
  );
}
