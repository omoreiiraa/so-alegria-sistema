import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ColaboradorActions } from "@/components/admin/colaborador-actions";
import { CARGO_LABEL } from "@/types/domain";
import type { CargoType } from "@/types/domain";

export const metadata: Metadata = { title: "Colaboradores" };

type Colab = {
  user_id: string;
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
    <Card className={!c.ativo ? "opacity-60" : undefined}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium">
            {c.nome_completo ?? c.email}
            {c.nome_tio && (
              <span className="text-sm font-normal text-muted-foreground">
                ({c.nome_tio})
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {c.email}
            {c.cidade ? ` · ${c.cidade}/${c.uf ?? ""}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!c.ativo && <Badge variant="secondary">Inativo</Badge>}
          {c.aprovado ? (
            <Badge variant="secondary">{CARGO_LABEL[c.cargo]}</Badge>
          ) : (
            <Badge className="bg-vermelho/10 text-vermelho">Pendente</Badge>
          )}
          <ColaboradorActions
            userId={c.user_id}
            aprovado={c.aprovado}
            ativo={c.ativo}
            cargo={c.cargo}
            nomeTio={c.nome_tio}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ColaboradoresPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "user_id, nome_completo, nome_tio, email, cargo, aprovado, ativo, cidade, uf",
    )
    .eq("role", "colaborador")
    .order("created_at", { ascending: false });

  const colaboradores = (data ?? []) as Colab[];
  const pendentes = colaboradores.filter((c) => !c.aprovado);
  const aprovados = colaboradores.filter((c) => c.aprovado);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colaboradores"
        description="Aprove cadastros, defina cargo e nome de tio."
      />

      {colaboradores.length === 0 && (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Nenhum colaborador ainda"
          description="Quando alguém se cadastrar pelo app, aparecerá aqui para aprovação."
        />
      )}

      {pendentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-vermelho">
            Aguardando aprovação ({pendentes.length})
          </h2>
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {pendentes.map((c) => (
              <ColabCard key={c.user_id} c={c} />
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
              <ColabCard key={c.user_id} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
