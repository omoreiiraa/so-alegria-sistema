"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Car, Truck, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import { criarVeiculo, atualizarVeiculo, excluirVeiculo } from "@/actions/veiculos";
import { VEHICLE_STATUS_LABEL, DIAS_SEMANA_CURTO } from "@/types/domain";
import type { VehicleType, VehicleStatus } from "@/types/domain";

export type Veiculo = {
  id: string;
  tipo: VehicleType;
  apelido: string;
  placa: string | null;
  dia_rodizio: number | null;
  status: VehicleStatus;
};

const STATUS: VehicleStatus[] = ["disponivel", "em_uso", "manutencao"];
const RODIZIO_DIAS = [1, 2, 3, 4, 5]; // seg–sex

export function VeiculosManager({ veiculos }: { veiculos: Veiculo[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<VehicleType>("carro");
  const [apelido, setApelido] = useState("");
  const [placa, setPlaca] = useState("");
  const [rodizio, setRodizio] = useState<number | null>(null);
  const [status, setStatus] = useState<VehicleStatus>("disponivel");

  function novo() {
    setEditId(null);
    setTipo("carro");
    setApelido("");
    setPlaca("");
    setRodizio(null);
    setStatus("disponivel");
    setOpen(true);
  }

  function editar(v: Veiculo) {
    setEditId(v.id);
    setTipo(v.tipo);
    setApelido(v.apelido);
    setPlaca(v.placa ?? "");
    setRodizio(v.dia_rodizio);
    setStatus(v.status);
    setOpen(true);
  }

  function salvar() {
    startTransition(async () => {
      const payload = { tipo, apelido, placa, dia_rodizio: rodizio, status };
      const res = editId
        ? await atualizarVeiculo(editId, payload)
        : await criarVeiculo(payload);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(editId ? "Veículo atualizado." : "Veículo cadastrado.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  function excluir() {
    if (!editId) return;
    startTransition(async () => {
      const res = await excluirVeiculo(editId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Veículo excluído.");
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={novo} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
          <Plus className="size-4" /> Novo veículo
        </Button>
      </div>

      {veiculos.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-6" />}
          title="Nenhum veículo cadastrado"
          description="Cadastre carros e vans da frota para vincular às festas."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {veiculos.map((v) => (
            <Card key={v.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    {v.tipo === "van" ? <Truck className="size-5" /> : <Car className="size-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{v.apelido}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {v.placa ?? "sem placa"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {VEHICLE_STATUS_LABEL[v.status]}
                      </Badge>
                      {v.dia_rodizio != null && (
                        <Badge className="gap-1 bg-amarelo/15 text-foreground">
                          <AlertTriangle className="size-3" /> Rodízio {DIAS_SEMANA_CURTO[v.dia_rodizio]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => editar(v)}
                  aria-label="Editar"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar veículo" : "Novo veículo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(["carro", "van"] as VehicleType[]).map((t) => (
                  <Chip key={t} active={tipo === t} onClick={() => setTipo(t)}>
                    {t === "van" ? "Van" : "Carro"}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="apelido">Apelido / modelo</Label>
                <Input id="apelido" value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Kombi branca" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placa">Placa</Label>
                <Input id="placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dia de rodízio (SP)</Label>
              <div className="flex flex-wrap gap-2">
                <Chip active={rodizio === null} onClick={() => setRodizio(null)}>Nenhum</Chip>
                {RODIZIO_DIAS.map((d) => (
                  <Chip key={d} active={rodizio === d} onClick={() => setRodizio(d)}>
                    {DIAS_SEMANA_CURTO[d]}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS.map((s) => (
                  <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                    {VEHICLE_STATUS_LABEL[s]}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {editId ? (
              <Button variant="ghost" onClick={excluir} disabled={pending} className="text-vermelho hover:text-vermelho">
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={salvar} disabled={pending || !apelido.trim()} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active ? "border-verde bg-verde/10 text-verde-escuro" : "border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
