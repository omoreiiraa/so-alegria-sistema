import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default async function VerificarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <Card className="text-center shadow-sm">
      <CardHeader>
        <div className="mx-auto mb-2 text-4xl">📩</div>
        <CardTitle className="font-display text-2xl">Confirme seu e-mail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação
          {email ? (
            <>
              {" "}
              para <span className="font-semibold text-foreground">{email}</span>
            </>
          ) : null}
          . Abra o e-mail e clique no link para ativar sua conta.
        </p>
        <p className="rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">
          Depois de confirmar, o escritório vai aprovar seu acesso e definir seu
          cargo antes de você ver a escala.
        </p>
        <Button
          render={<Link href="/login" />}
          variant="outline"
          className="w-full font-semibold"
        >
          Voltar para o login
        </Button>
      </CardContent>
    </Card>
  );
}
