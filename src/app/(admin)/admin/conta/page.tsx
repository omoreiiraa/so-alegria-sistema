import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrocarSenhaForm } from "@/components/admin/trocar-senha-form";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const session = await requireAdmin();

  return (
    <div className="max-w-lg space-y-5">
      <PageHeader
        title="Minha conta"
        description="Acesso ao painel administrativo."
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Dados de acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{session.profile.nome_completo ?? session.email}</p>
          <p className="text-muted-foreground">{session.email}</p>
        </CardContent>
      </Card>

      <TrocarSenhaForm />
    </div>
  );
}
