import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Aguardando aprovação" };

export default async function AguardandoAprovacaoPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.aprovado) redirect("/app");

  return (
    <Card className="text-center shadow-sm">
      <CardHeader>
        <div className="mx-auto mb-1 text-4xl">🎈</div>
        <CardTitle className="font-display text-xl">
          Cadastro recebido!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Olá,{" "}
          <span className="font-semibold text-foreground">
            {session.profile.nome_completo?.split(" ")[0]}
          </span>
          . Seu cadastro está em análise pelo escritório da Só Alegria.
        </p>
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          Assim que aprovarem e definirem seu cargo, você poderá ver sua escala,
          confirmar festas e acompanhar pagamentos por aqui.
        </p>
      </CardContent>
    </Card>
  );
}
