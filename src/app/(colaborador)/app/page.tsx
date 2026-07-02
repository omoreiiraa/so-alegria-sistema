import { CalendarDays } from "lucide-react";
import { requireColaborador } from "@/lib/auth";
import { EmptyState } from "@/components/common/empty-state";
import { CARGO_LABEL } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

export default async function EscalaPage() {
  const { profile } = await requireColaborador();
  const nome = profile.nome_tio || profile.nome_completo?.split(" ")[0] || "tio";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {nome} 👋
        </h1>
        <div className="mt-2">
          <Badge variant="secondary" className="bg-verde/10 text-verde-escuro">
            {CARGO_LABEL[profile.cargo]}
          </Badge>
        </div>
      </div>

      <EmptyState
        icon={<CalendarDays className="size-6" />}
        title="Nenhuma festa por aqui ainda"
        description="Assim que o escritório escalar você para uma festa, ela aparece aqui com a opção de confirmar ou recusar."
      />
    </div>
  );
}
