"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Quem cai aqui é o colaborador, sem login e sem contexto técnico. Mostra um
 * recado humano; o erro real fica no log do servidor.
 */
export default function PublicoError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <AlertTriangle className="size-6 text-laranja" />
        <h1 className="font-display text-lg font-bold">Algo deu errado por aqui</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Não conseguimos abrir esta página agora. Tente de novo em alguns
          minutos ou fale com o escritório.
        </p>
      </CardContent>
    </Card>
  );
}
