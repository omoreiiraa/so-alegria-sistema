"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  MapPin,
  Plane,
  Car,
  Wallet,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { responderConvite } from "@/actions/links";
import { formatDateLong, formatTime } from "@/lib/utils/date";
import { formatBRL } from "@/lib/utils/money";
import { PRESENCE_MODE_LABEL } from "@/types/domain";
import type { ConviteFestaInfo, ConviteAssignmentInfo } from "@/types/domain";

export function ConviteResposta({
  token,
  nome,
  festa,
  assignment,
}: {
  token: string;
  nome: string;
  festa: ConviteFestaInfo;
  assignment: ConviteAssignmentInfo;
}) {
  const [pending, startTransition] = useTransition();
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [resposta, setResposta] = useState<"aceito" | "recusado" | null>(null);

  function responder(aceita: boolean) {
    startTransition(async () => {
      const res = await responderConvite(token, aceita, aceita ? undefined : motivo);
      if (res?.error) toast.error(res.error);
      else setResposta(aceita ? "aceito" : "recusado");
    });
  }

  if (resposta) {
    const aceito = resposta === "aceito";
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          {aceito ? (
            <CheckCircle2 className="size-7 text-verde" />
          ) : (
            <XCircle className="size-7 text-muted-foreground" />
          )}
          <h2 className="font-display text-lg font-bold">
            {aceito ? "Presença confirmada!" : "Convite recusado"}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {aceito
              ? "O escritório já foi avisado. Anote a data na sua agenda — a gente se vê na festa!"
              : "Sem problema, o escritório já foi avisado. Até a próxima!"}
          </p>
          <p className="text-xs text-muted-foreground">Pode fechar esta página.</p>
        </CardContent>
      </Card>
    );
  }

  const endereco = [
    [festa.logradouro, festa.numero].filter(Boolean).join(", "),
    festa.complemento,
    festa.bairro,
    [festa.cidade, festa.uf].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">
          {nome ? `${nome.split(" ")[0]}, você foi escalado!` : "Você foi escalado!"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confira os detalhes e responda. Este convite vale por 24 horas.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="font-display text-lg">A festa</CardTitle>
          {festa.is_viagem && (
            <Badge className="gap-1 bg-amarelo/15 text-foreground">
              <Plane className="size-3" /> Viagem
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Linha icone={<CalendarDays className="size-4" />}>
            <span className="font-medium capitalize">{formatDateLong(festa.data)}</span>
          </Linha>
          <Linha icone={<Clock className="size-4" />}>
            {formatTime(festa.hora_inicio)} às {formatTime(festa.hora_fim)}
          </Linha>
          {endereco && (
            <Linha icone={<MapPin className="size-4" />}>{endereco}</Linha>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Sua função</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {assignment.presence_mode && (
            <Linha icone={<MapPin className="size-4" />}>
              Apresentar-se {PRESENCE_MODE_LABEL[assignment.presence_mode].toLowerCase()}
              {assignment.horario_apresentacao
                ? ` às ${formatTime(assignment.horario_apresentacao)}`
                : ""}
            </Linha>
          )}
          {assignment.is_driver && (
            <Linha icone={<Car className="size-4" />}>
              Você vai dirigir o carro da equipe
            </Linha>
          )}
          {assignment.cache_estimado !== null && (
            <Linha icone={<Wallet className="size-4" />}>
              Cachê previsto:{" "}
              <span className="font-semibold text-foreground">
                {formatBRL(assignment.cache_estimado)}
              </span>
            </Linha>
          )}
        </CardContent>
      </Card>

      {recusando ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="motivo">Quer dizer o motivo? (opcional)</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: já tenho compromisso nesse dia"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                disabled={pending}
                onClick={() => setRecusando(false)}
              >
                Voltar
              </Button>
              <Button
                className="flex-1 bg-vermelho font-semibold text-white hover:bg-vermelho/90"
                disabled={pending}
                onClick={() => responder(false)}
              >
                {pending ? "Enviando…" : "Confirmar recusa"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => responder(true)}
            disabled={pending}
            className="flex-1 bg-verde font-semibold text-white hover:bg-verde-escuro"
          >
            {pending ? "Enviando…" : "Aceitar festa"}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setRecusando(true)}
            className="flex-1 font-semibold"
          >
            Não posso
          </Button>
        </div>
      )}
    </div>
  );
}

function Linha({
  icone,
  children,
}: {
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-start gap-2 text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icone}</span>
      <span>{children}</span>
    </p>
  );
}
