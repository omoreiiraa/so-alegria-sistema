"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCEP, lookupCep } from "@/lib/utils/cep";
import { formatBRLInput, parseBRLInput } from "@/lib/utils/money";
import { formatPhoneBR } from "@/lib/utils/phone";
import { criarFesta, atualizarFesta } from "@/actions/festas";
import { VEHICLE_TYPE_LABEL } from "@/types/domain";
import type { VehicleType } from "@/types/domain";

type Option = { id: string; nome: string };
type VehicleOption = { id: string; apelido: string; tipo: VehicleType; placa: string | null };

export type FestaInitial = {
  fechada_por: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  party_type_ids: string[];
  contratante_nome: string;
  aniversariante_nome: string;
  aniversariante_idade: string;
  qtd_criancas: string;
  is_viagem: boolean;
  observacoes: string;
  valor_festa: string;
  telefone_contato: string;
  tema_festa: string;
  qtd_recreadores: string;
  partner_id: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  vehicle_ids: string[];
};

const EMPTY: FestaInitial = {
  fechada_por: "",
  data: "",
  hora_inicio: "",
  hora_fim: "",
  party_type_ids: [],
  contratante_nome: "",
  aniversariante_nome: "",
  aniversariante_idade: "",
  qtd_criancas: "",
  is_viagem: false,
  observacoes: "",
  valor_festa: "",
  telefone_contato: "",
  tema_festa: "",
  qtd_recreadores: "",
  partner_id: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  vehicle_ids: [],
};

export function FestaForm({
  festaId,
  initial,
  partyTypes,
  partners,
  vehicles,
}: {
  festaId?: string;
  initial?: FestaInitial;
  partyTypes: Option[];
  partners: Option[];
  vehicles: VehicleOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FestaInitial>(initial ?? EMPTY);
  const [usaParceiro, setUsaParceiro] = useState(!!initial?.partner_id);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const set = <K extends keyof FestaInitial>(k: K, v: FestaInitial[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleCep() {
    if (form.cep.replace(/\D/g, "").length !== 8) return;
    setBuscandoCep(true);
    const found = await lookupCep(form.cep);
    if (found) {
      setForm((f) => ({
        ...f,
        logradouro: found.logradouro || f.logradouro,
        bairro: found.bairro || f.bairro,
        cidade: found.cidade || f.cidade,
        uf: found.uf || f.uf,
      }));
    }
    setBuscandoCep(false);
  }

  function toggleVehicle(id: string) {
    setForm((f) => ({
      ...f,
      vehicle_ids: f.vehicle_ids.includes(id)
        ? f.vehicle_ids.filter((v) => v !== id)
        : [...f.vehicle_ids, id],
    }));
  }

  function togglePartyType(id: string) {
    setForm((f) => ({
      ...f,
      party_type_ids: f.party_type_ids.includes(id)
        ? f.party_type_ids.filter((v) => v !== id)
        : [...f.party_type_ids, id],
    }));
  }

  function salvar() {
    const payload = {
      fechada_por: form.fechada_por,
      data: form.data,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      party_type_ids: form.party_type_ids,
      contratante_nome: form.contratante_nome,
      aniversariante_nome: form.aniversariante_nome,
      aniversariante_idade: form.aniversariante_idade
        ? Number(form.aniversariante_idade)
        : null,
      qtd_criancas: form.qtd_criancas ? Number(form.qtd_criancas) : null,
      is_viagem: form.is_viagem,
      observacoes: form.observacoes,
      valor_festa: parseBRLInput(form.valor_festa),
      telefone_contato: form.telefone_contato,
      tema_festa: form.tema_festa,
      qtd_recreadores: form.qtd_recreadores ? Number(form.qtd_recreadores) : null,
      partner_id: usaParceiro ? form.partner_id || null : null,
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
      vehicle_ids: form.vehicle_ids,
    };

    startTransition(async () => {
      const res = festaId
        ? await atualizarFesta(festaId, payload)
        : await criarFesta(payload);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(festaId ? "Festa atualizada!" : "Festa criada!");
      router.push(`/admin/festas/${res.id ?? festaId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Em telas largas os blocos se dividem em duas colunas: aproveita o
          espaço sem esticar os campos, que ficariam ruins de ler. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Festa fechada por
          </h2>
          <div className="space-y-2">
            <Label htmlFor="fechada_por">Nome de quem fechou/cadastrou a festa</Label>
            <Input
              id="fechada_por"
              value={form.fechada_por}
              onChange={(e) => set("fechada_por", e.target.value)}
              placeholder="Seu nome"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Quando
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Início</Label>
              <Input id="hora_inicio" type="time" value={form.hora_inicio} onChange={(e) => set("hora_inicio", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_fim">Fim</Label>
              <Input id="hora_fim" type="time" value={form.hora_fim} onChange={(e) => set("hora_fim", e.target.value)} />
            </div>
          </div>

          <Toggle
            active={form.is_viagem}
            onClick={() => set("is_viagem", !form.is_viagem)}
            label="É viagem (fora da cidade)"
            hint="Dobra o cachê da equipe"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Tipo de festa
          </h2>
          <div className="flex flex-wrap gap-2">
            {partyTypes.map((t) => (
              <Chip
                key={t.id}
                active={form.party_type_ids.includes(t.id)}
                onClick={() => togglePartyType(t.id)}
              >
                {t.nome}
              </Chip>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Detalhes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contratante">Contratante</Label>
              <Input id="contratante" value={form.contratante_nome} onChange={(e) => set("contratante_nome", e.target.value)} placeholder="Quem contratou" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_contato">Telefone de contato</Label>
              <Input
                id="telefone_contato"
                inputMode="tel"
                value={form.telefone_contato}
                onChange={(e) => set("telefone_contato", formatPhoneBR(e.target.value))}
                placeholder="(11) 98765-4321"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_100px_120px]">
            <div className="space-y-2">
              <Label htmlFor="aniversariante">Aniversariante</Label>
              <Input id="aniversariante" value={form.aniversariante_nome} onChange={(e) => set("aniversariante_nome", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idade">Idade</Label>
              <Input id="idade" type="number" inputMode="numeric" value={form.aniversariante_idade} onChange={(e) => set("aniversariante_idade", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtd">Nº crianças</Label>
              <Input id="qtd" type="number" inputMode="numeric" value={form.qtd_criancas} onChange={(e) => set("qtd_criancas", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tema">Tema da festa</Label>
            <Input id="tema" value={form.tema_festa} onChange={(e) => set("tema_festa", e.target.value)} placeholder="Ex.: Homem-Aranha, Frozen, Circo" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Orçamento
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valor_festa">Valor da festa</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="valor_festa"
                  inputMode="numeric"
                  className="pl-9"
                  value={form.valor_festa}
                  onChange={(e) => set("valor_festa", formatBRLInput(e.target.value))}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtd_recreadores">Nº de recreadores/monitores</Label>
              <Input
                id="qtd_recreadores"
                type="number"
                inputMode="numeric"
                value={form.qtd_recreadores}
                onChange={(e) => set("qtd_recreadores", e.target.value)}
                placeholder="Ex.: 3"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Local
          </h2>
          <div className="flex gap-2">
            <Chip active={!usaParceiro} onClick={() => setUsaParceiro(false)}>Endereço</Chip>
            <Chip active={usaParceiro} onClick={() => setUsaParceiro(true)} disabled={partners.length === 0}>
              Buffet parceiro
            </Chip>
          </div>

          {usaParceiro ? (
            partners.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {partners.map((p) => (
                  <Chip key={p.id} active={form.partner_id === p.id} onClick={() => set("partner_id", p.id)}>
                    {p.nome}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum buffet cadastrado ainda.</p>
            )
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" inputMode="numeric" value={form.cep} onChange={(e) => set("cep", formatCEP(e.target.value))} onBlur={handleCep} placeholder="00000-000" />
                {buscandoCep && <p className="text-xs text-muted-foreground">Buscando endereço…</p>}
              </div>
              <div className="grid grid-cols-[1fr_90px] gap-3">
                <Field label="Logradouro" value={form.logradouro} onChange={(v) => set("logradouro", v)} />
                <Field label="Número" value={form.numero} onChange={(v) => set("numero", v)} />
              </div>
              <Field label="Complemento" value={form.complemento} onChange={(v) => set("complemento", v)} />
              <div className="grid grid-cols-[1fr_1fr_70px] gap-3">
                <Field label="Bairro" value={form.bairro} onChange={(v) => set("bairro", v)} />
                <Field label="Cidade" value={form.cidade} onChange={(v) => set("cidade", v)} />
                <Field label="UF" value={form.uf} maxLength={2} onChange={(v) => set("uf", v.toUpperCase())} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {vehicles.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Veículos
            </h2>
            <div className="flex flex-wrap gap-2">
              {vehicles.map((v) => (
                <Chip key={v.id} active={form.vehicle_ids.includes(v.id)} onClick={() => toggleVehicle(v.id)}>
                  {VEHICLE_TYPE_LABEL[v.tipo]} · {v.apelido}
                  {v.placa ? ` (${v.placa})` : ""}
                </Chip>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2 p-5">
          <Label htmlFor="obs">Observações</Label>
          <Textarea id="obs" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} placeholder="Detalhes, ponto de referência, combinados…" />
        </CardContent>
      </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button onClick={salvar} disabled={pending} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
          {pending ? "Salvando…" : festaId ? "Salvar festa" : "Criar festa"}
        </Button>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
        active
          ? "border-verde bg-verde/10 text-verde-escuro"
          : "border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Toggle({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
        active ? "border-laranja bg-laranja/10" : "border-border hover:bg-muted",
      )}
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full border-2",
          active ? "border-laranja bg-laranja text-white" : "border-muted-foreground/40",
        )}
      >
        {active && "✓"}
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}
