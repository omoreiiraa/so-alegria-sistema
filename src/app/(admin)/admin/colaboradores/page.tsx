import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CARGO_LABEL } from "@/types/domain";

export const metadata: Metadata = { title: "Colaboradores" };

export default async function ColaboradoresPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: colaboradores } = await supabase
    .from("profiles")
    .select("user_id, nome_completo, cargo, aprovado, ativo, email")
    .eq("role", "colaborador")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colaboradores"
        description="Aprove cadastros, defina cargo e nome de tio."
      />

      {!colaboradores || colaboradores.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Nenhum colaborador ainda"
          description="Quando alguém se cadastrar pelo app, aparecerá aqui para aprovação."
        />
      ) : (
        <div className="grid gap-3">
          {colaboradores.map((c) => (
            <Card key={c.user_id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {c.nome_completo ?? c.email}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!c.aprovado && (
                    <Badge className="bg-vermelho/10 text-vermelho">Pendente</Badge>
                  )}
                  <Badge variant="secondary">{CARGO_LABEL[c.cargo]}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
