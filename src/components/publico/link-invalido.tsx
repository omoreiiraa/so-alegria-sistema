import { Clock, Ban, CheckCircle2, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { EstadoLink } from "@/types/domain";

const MENSAGENS: Record<
  Exclude<EstadoLink, "valido">,
  { icone: React.ReactNode; titulo: string; corpo: string }
> = {
  expirado: {
    icone: <Clock className="size-6 text-laranja" />,
    titulo: "Este link expirou",
    corpo:
      "O convite vale por 24 horas. Fale com o escritório para receber um link novo.",
  },
  usado: {
    icone: <CheckCircle2 className="size-6 text-verde" />,
    titulo: "Este link já foi usado",
    corpo: "Não é preciso fazer nada — já registramos por aqui.",
  },
  respondido: {
    icone: <CheckCircle2 className="size-6 text-verde" />,
    titulo: "Você já respondeu este convite",
    corpo: "Se precisar mudar a resposta, fale com o escritório.",
  },
  revogado: {
    icone: <Ban className="size-6 text-vermelho" />,
    titulo: "Este link foi cancelado",
    corpo: "O escritório gerou um link novo. Procure a mensagem mais recente.",
  },
  inexistente: {
    icone: <SearchX className="size-6 text-muted-foreground" />,
    titulo: "Link não encontrado",
    corpo: "Confira se o endereço foi copiado por inteiro da mensagem.",
  },
};

export function LinkInvalido({ estado }: { estado: Exclude<EstadoLink, "valido"> }) {
  const m = MENSAGENS[estado];
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        {m.icone}
        <h1 className="font-display text-lg font-bold">{m.titulo}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{m.corpo}</p>
      </CardContent>
    </Card>
  );
}
