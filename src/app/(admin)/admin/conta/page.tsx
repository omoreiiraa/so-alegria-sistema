import type { Metadata } from "next";
import { requireEquipe } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrocarSenhaForm } from "@/components/admin/trocar-senha-form";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL } from "@/types/domain";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const session = await requireEquipe();

  return (
    <div className="max-w-lg space-y-5">
      <PageHeader
        title="Minha conta"
        description="Seu acesso ao painel. A senha é sua: ninguém mais precisa saber."
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Dados de acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{session.profile.nome_completo ?? session.email}</p>
          <p className="text-muted-foreground">{session.email}</p>
          <Badge variant="secondary" className="mt-2">
            {ROLE_LABEL[session.profile.role]}
          </Badge>
        </CardContent>
      </Card>

      <TrocarSenhaForm />
    </div>
  );
}
