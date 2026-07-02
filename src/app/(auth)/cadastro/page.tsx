import type { Metadata } from "next";
import { CadastroForm } from "./cadastro-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">Criar minha conta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Preencha seus dados para entrar na equipe.
        </p>
      </CardHeader>
      <CardContent>
        <CadastroForm />
      </CardContent>
    </Card>
  );
}
