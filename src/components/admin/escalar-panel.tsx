"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, AlertTriangle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { escalarColaborador } from "@/actions/festas";
import { lembrarConvite } from "@/lib/convite-cache";
import { CARGO_LABEL, PRESENCE_MODE_LABEL } from "@/types/domain";
import type { CargoType, PresenceMode } from "@/types/domain";

type Eligible = {
  profileId: string;
  nome: string;
  cargo: CargoType;
  conflito: boolean;
};

type Carro = { id: string; apelido: string; placa: string | null };

export function EscalarPanel({
  festaId,
  carros,
  eligible,
}: {
  festaId: string;
  carros: Carro[];
  eligible: Eligible[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<Eligible | null>(null);

  const [presence, setPresence] = useState<PresenceMode>("na_empresa");
  const [horario, setHorario] = useState("");
  const [driver, setDriver] = useState(false);
  const [carId, setCarId] = useState("");
  const [cacheCustom, setCacheCustom] = useState("");

  const filtrados = eligible
    .filter((e) => e.nome.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(a.conflito) - Number(b.conflito));

  function abrir(e: Eligible) {
    setSel(e);
    setPresence("na_empresa");
    setHorario("");
    setDriver(false);
    setCarId("");
    setCacheCustom("");
  }

  function escalar() {
    if (!sel) return;
    startTransition(async () => {
      const res = await escalarColaborador({
        party_id: festaId,
        profile_id: sel.profileId,
        presence_mode: presence,
        horario_apresentacao: horario || null,
        is_driver: driver,
        vehicle_id: driver && carId ? carId : null,
        cache_custom: cacheCustom ? Number(cacheCustom) : null,
      });
      if (res?.error) toast.error(res.error);
      else {
        if (res?.url) {
          // Guarda o link para o card da equipe poder recopiá-lo depois.
          if (res.linkId) lembrarConvite(res.linkId, res.url, res.expiraEm ?? null);
          await navigator.clipboard.writeText(res.url).catch(() => {});
          toast.success(`${sel.nome} escalado(a)! Link do convite copiado.`);
        } else {
          toast.success(`${sel.nome} escalado(a)!`);
        }
        setSel(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar colaborador…"
          className="pl-9"
        />
      </div>

      {filtrados.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum colaborador disponível para escalar.
        </p>
      ) : (
        <div className="space-y-2">
          {filtrados.map((e) => (
            <div
              key={e.profileId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{e.nome}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {CARGO_LABEL[e.cargo]}
                  </Badge>
                  {e.conflito && (
                    <Badge className="gap-1 bg-vermelho/10 text-vermelho">
                      <AlertTriangle className="size-3" /> Outra festa no dia
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => abrir(e)}
                className="bg-verde font-semibold text-white hover:bg-verde-escuro"
              >
                <UserPlus className="size-4" /> Escalar
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={sel !== null} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalar {sel?.nome}</DialogTitle>
            <DialogDescription>
              Defina a apresentação e o veículo. O link do convite é gerado em
              seguida, para você enviar no WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Apresentação</Label>
              <div className="flex gap-2">
                {(["na_empresa", "direto_no_local"] as PresenceMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPresence(m)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      presence === m
                        ? "border-verde bg-verde/10 text-verde-escuro"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {PRESENCE_MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="horario">Horário</Label>
                <Input id="horario" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cache">Cachê custom (opcional)</Label>
                <Input id="cache" type="number" inputMode="numeric" value={cacheCustom} onChange={(e) => setCacheCustom(e.target.value)} placeholder="R$" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDriver((d) => !d)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                driver ? "border-laranja bg-laranja/10" : "border-border hover:bg-muted",
              )}
            >
              <span>
                <span className="block font-medium">Motorista (dirige o carro)</span>
                <span className="text-xs text-muted-foreground">+ R$ 50 no cachê</span>
              </span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border-2 text-xs",
                  driver ? "border-laranja bg-laranja text-white" : "border-muted-foreground/40",
                )}
              >
                {driver && "✓"}
              </span>
            </button>

            {driver && carros.length > 0 && (
              <div className="space-y-2">
                <Label>Carro</Label>
                <div className="flex flex-wrap gap-2">
                  {carros.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCarId(c.id === carId ? "" : c.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        carId === c.id
                          ? "border-verde bg-verde/10 text-verde-escuro"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {c.apelido}
                      {c.placa ? ` · ${c.placa}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSel(null)} disabled={pending}>
              Voltar
            </Button>
            <Button
              onClick={escalar}
              disabled={pending}
              className="bg-verde font-semibold text-white hover:bg-verde-escuro"
            >
              {pending ? "Escalando…" : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
