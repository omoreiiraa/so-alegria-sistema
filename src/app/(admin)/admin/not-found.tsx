import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Não encontrado" };

/**
 * 404 dentro do painel: é o que aparece quando `notFound()` dispara numa ficha
 * de festa ou de colaborador que não existe mais (apagada, ou id errado na
 * URL). Renderiza dentro do layout do admin, então a navegação continua ali —
 * a pessoa não perde o contexto por causa de um registro que sumiu.
 */
export default function AdminNotFound() {
  return (
    <EmptyState
      icon={<SearchX className="size-6" />}
      title="Não encontramos este registro"
      description="Ele pode ter sido excluído, ou o endereço está errado. Use o menu para voltar."
      action={
        <Button
          render={<Link href="/admin" />} nativeButton={false}
          className="bg-verde font-semibold text-white hover:bg-verde-escuro"
        >
          Ir para o painel
        </Button>
      }
    />
  );
}
