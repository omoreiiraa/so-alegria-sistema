"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarDays, Clock, MapPin, Car, Plane, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  confirmarConvite,
  recusarConvite,
  cancelarConfirmacao,
} from "@/actions/escala";
import { formatDateLong, formatTime } from "@/lib/utils/date";
import { formatBRL } from "@/lib/utils/money";
import { PRESENCE_MODE_LABEL } from "@/types/domain";
import type { AssignmentStatus, PresenceMode } from "@/types/domain";

export type EscalaItem = {
  id: string;
  status: AssignmentStatus;
  presenceMode: PresenceMode | null;
  horarioApresentacao: string | null;
  isDriver: boolean;
  cache: number | null;
  cachePrevisto: boolean;
  motivoRecusa: string | null;
  party: {
    data: string;
    horaInicio: string;
    horaFim: string;
    isViagem: boolean;
    tipo: string | null;
    local: string;
  };
};

export function AssignmentCard({ item }: { item: EscalaItem }) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<null | "recusar" | "cancelar">(null);
  const [motivo, setMotivo] = useState("");
  const pendente = item.status === "pendente";

  function confirmar() {
    startTransition(async () => {
      const res = await confirmarConvite(item.id);
      if (res?.error) toast.error(res.error);
      else toast.success("Festa confirmada! 🎉");
    });
  }

  function submitDialog() {
    const acao = dialog;
    startTransition(async () => {
      const res =
        acao === "recusar"
          ? await recusarConvite(item.id, motivo)
          : await cancelarConfirmacao(item.id, motivo);
      if (res?.error) toast.error(res.error);
      else toast.success(acao === "recusar" ? "Convite recusado." : "Confirmação cancelada.");
      setDialog(null);
      setMotivo("");
    });
  }

  return (
    <Card
      className={
        pendente ? "border-laranja/40 ring-1 ring-laranja/20" : undefined
      }
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight">
              {item.party.tipo ?? "Festa"}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
              <CalendarDays className="size-3.5" />
              {formatDateLong(item.party.data)}
            </p>
          </div>
          <StatusBadge status={item.status} pendente={pendente} />
        </div>

        <div className="space-y-1.5 text-sm">
          <Row icon={<Clock className="size-3.5" />}>
            {formatTime(item.party.horaInicio)} às {formatTime(item.party.horaFim)}
          </Row>
          {item.party.local && (
            <Row icon={<MapPin className="size-3.5" />}>{item.party.local}</Row>
          )}
          {item.presenceMode && (
            <Row icon={<Building2 className="size-3.5" />}>
              {PRESENCE_MODE_LABEL[item.presenceMode]}
              {item.horarioApresentacao
                ? ` · chegar ${formatTime(item.horarioApresentacao)}`
                : ""}
            </Row>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {item.party.isViagem && (
            <Badge variant="secondary" className="gap-1 bg-amarelo/15 text-foreground">
              <Plane className="size-3" /> Viagem
            </Badge>
          )}
          {item.isDriver && (
            <Badge variant="secondary" className="gap-1">
              <Car className="size-3" /> Motorista
            </Badge>
          )}
          {item.cache != null && (
            <span className="ml-auto text-right">
              <span className="block text-[11px] leading-none text-muted-foreground">
                {item.cachePrevisto ? "Cachê previsto" : "Cachê"}
              </span>
              <span className="font-display text-lg font-extrabold text-verde-escuro tabular">
                {formatBRL(item.cache)}
              </span>
            </span>
          )}
        </div>

        {item.motivoRecusa && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Motivo: {item.motivoRecusa}
          </p>
        )}

        {pendente && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setDialog("recusar")}
              className="border-vermelho/30 font-semibold text-vermelho hover:bg-vermelho/5"
            >
              Recusar
            </Button>
            <Button
              disabled={pending}
              onClick={confirmar}
              className="bg-verde font-semibold text-white hover:bg-verde-escuro"
            >
              Confirmar
            </Button>
          </div>
        )}

        {item.status === "confirmada" && (
          <div className="pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => setDialog("cancelar")}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-vermelho hover:underline"
            >
              Cancelar participação
            </button>
          </div>
        )}
      </CardContent>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "recusar" ? "Recusar convite" : "Cancelar participação"}
            </DialogTitle>
            <DialogDescription>
              Conte o motivo (opcional). O escritório será avisado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: tenho outro compromisso nesse dia."
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>
              Voltar
            </Button>
            <Button
              onClick={submitDialog}
              disabled={pending}
              className="bg-vermelho font-semibold text-white hover:bg-vermelho/90"
            >
              {dialog === "recusar" ? "Recusar festa" : "Cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-muted-foreground">
      <span className="text-muted-foreground/70">{icon}</span>
      <span className="text-foreground">{children}</span>
    </p>
  );
}

function StatusBadge({
  status,
  pendente,
}: {
  status: AssignmentStatus;
  pendente: boolean;
}) {
  if (pendente)
    return <Badge className="bg-laranja/15 text-laranja-escuro">Convite</Badge>;
  if (status === "confirmada")
    return <Badge className="bg-verde/15 text-verde-escuro">Confirmada</Badge>;
  if (status === "recusada")
    return <Badge variant="secondary">Recusada</Badge>;
  return <Badge variant="secondary">Cancelada</Badge>;
}
