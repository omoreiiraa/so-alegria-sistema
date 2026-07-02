import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { requireColaborador } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Pagamentos" };

export default async function PagamentosPage() {
  await requireColaborador();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Pagamentos"
        description="Pagamentos toda segunda-feira, referentes a seg–dom da semana anterior."
      />
      <EmptyState
        icon={<Wallet className="size-6" />}
        title="Nada a receber ainda"
        description="Quando você confirmar festas e elas forem realizadas, o valor da semana aparece aqui."
      />
    </div>
  );
}
