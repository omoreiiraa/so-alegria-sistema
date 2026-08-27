import type { Metadata } from "next";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NovoColaborador } from "@/components/admin/novo-colaborador";
import { cn } from "@/lib/utils";
import { CARGO_LABEL } from "@/types/domain";
import type { CargoType } from "@/types/domain";

export const metadata: Metadata = { title: "Colaboradores" };

type Colab = {
  id: string;
  cadastro_preenchido: boolean;
  nome_completo: string | null;
  nome_tio: string | null;
  email: string | null;
  cargo: CargoType;
  aprovado: boolean;
  ativo: boolean;
  cidade: string | null;
  uf: string | null;
};

function ColabCard({ c }: { c: Colab }) {
  return (
    <Link href={`/admin/colaboradores/${c.id}`} className="block">
      <Card
        className={cn(
          "transition-shadow hover:shadow-md",
          !c.ativo && "opacity-60",
        )}
      >
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium">
              {c.nome_completo ?? c.email ?? "Sem nome"}
              {c.nome_tio && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({c.nome_tio})
                </span>
              )}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {c.email ?? "aguardando cadastro"}
              {c.cidade ? ` · ${c.cidade}/${c.uf ?? ""}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!c.ativo && <Badge variant="secondary">Inativo</Badge>}
            {!c.cadastro_preenchido && (
              <Badge className="bg-laranja/15 text-laranja-escuro">Cadastro pendente</Badge>
            )}
            {c.aprovado ? (
              <Badge variant="secondary">{CARGO_LABEL[c.cargo]}</Badge>
            ) : (
              <Badge className="bg-vermelho/10 text-vermelho">Pendente</Badge>
            )}
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function ColaboradoresPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, nome_completo, nome_tio, email, cargo, aprovado, ativo, cidade, uf, cpf",
    )
    .eq("role", "colaborador")
    .order("created_at", { ascending: false });

  // Sem CPF, o colaborador ainda não abriu o link de cadastro.
  const colaboradores = ((data ?? []) as (Omit<Colab, "cadastro_preenchido"> & {
    cpf: string | null;
  })[]).map((c) => ({ ...c, cadastro_preenchido: c.cpf !== null }));
  const pendentes = colaboradores.filter((c) => !c.aprovado);
  const aprovados = colaboradores.filter((c) => c.aprovado);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colaboradores"
        description="Clique num colaborador para ver a ficha completa, o link de cadastro e o histórico de festas."
        action={<NovoColaborador />}
      />

      {colaboradores.length === 0 && (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Nenhum colaborador ainda"
          description="Clique em “Novo colaborador” para criar a ficha e enviar o link de cadastro."
        />
      )}

      {pendentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-vermelho">
            Aguardando cadastro/aprovação ({pendentes.length})
          </h2>
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {pendentes.map((c) => (
              <ColabCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      {aprovados.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Equipe ({aprovados.length})
          </h2>
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {aprovados.map((c) => (
              <ColabCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
