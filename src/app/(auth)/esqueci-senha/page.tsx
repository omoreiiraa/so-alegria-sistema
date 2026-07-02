"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/app/perfil`,
    });
    setEnviado(true);
    setLoading(false);
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">Recuperar senha</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link para redefinir sua senha.
        </p>
      </CardHeader>
      <CardContent>
        {enviado ? (
          <Alert>
            <AlertDescription>
              Se existir uma conta com esse e-mail, o link de redefinição foi
              enviado. Verifique sua caixa de entrada.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-laranja font-bold text-white hover:bg-laranja-escuro"
            >
              {loading ? "Enviando…" : "Enviar link"}
            </Button>
          </form>
        )}
        <p className="pt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-verde-escuro hover:underline">
            Voltar para o login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
