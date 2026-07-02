import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Card className="shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">Bem-vindo de volta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Entre para ver sua escala e pagamentos.
        </p>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
      </CardContent>
    </Card>
  );
}
