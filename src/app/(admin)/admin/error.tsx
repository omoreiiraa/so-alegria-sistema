"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

/**
 * Falha de renderização dentro do painel. Sem isto, um erro de servidor cai na
 * tela padrão do Next, fora da identidade do sistema e sem saída. `reset()`
 * tenta remontar a rota — resolve os casos transitórios (rede, timeout).
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // O detalhe fica no log do servidor; a tela não expõe stack ao usuário.
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={<AlertTriangle className="size-6 text-laranja" />}
      title="Algo deu errado nesta tela"
      description={
        error.digest
          ? `Tente de novo. Se continuar, informe o código ${error.digest} ao suporte.`
          : "Tente de novo em alguns instantes."
      }
      action={
        <Button onClick={reset} variant="outline" className="font-semibold">
          <RotateCw className="size-4" /> Tentar de novo
        </Button>
      }
    />
  );
}
