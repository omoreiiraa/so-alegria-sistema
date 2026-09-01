"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { atualizarColaborador } from "@/actions/colaboradores";
import { formatPhoneBR, formatPhoneNational } from "@/lib/utils/phone";
import { formatCEP, lookupCep } from "@/lib/utils/cep";
import { formatCPF } from "@/lib/utils/cpf";
import { formatCNPJ } from "@/lib/utils/cnpj";
import { formatRG } from "@/lib/utils/rg";

export type FichaColaborador = {
  nome_completo: string | null;
  nome_tio: string | null;
  rg: string | null;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  celular: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  chave_pix: string | null;
};

type Form = Record<keyof FichaColaborador, string>;

function paraFormulario(f: FichaColaborador): Form {
  return {
    nome_completo: f.nome_completo ?? "",
    nome_tio: f.nome_tio ?? "",
    rg: f.rg ? formatRG(f.rg) : "",
    cpf: f.cpf ? formatCPF(f.cpf) : "",
    cnpj: f.cnpj ? formatCNPJ(f.cnpj) : "",
    email: f.email ?? "",
    celular: f.celular ? formatPhoneNational(f.celular) : "",
    cep: f.cep ? formatCEP(f.cep) : "",
    logradouro: f.logradouro ?? "",
    numero: f.numero ?? "",
    complemento: f.complemento ?? "",
    bairro: f.bairro ?? "",
    cidade: f.cidade ?? "",
    uf: f.uf ?? "",
    chave_pix: f.chave_pix ?? "",
  };
}

/**
 * Edição manual da ficha. Serve para o pedido do dia a dia — "mudei de número",
 * "troquei a chave PIX" — sem precisar mandar link e esperar o colaborador.
 */
export function EditarColaborador({
  profileId,
  ficha,
}: {
  profileId: string;
  ficha: FichaColaborador;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [form, setForm] = useState<Form>(() => paraFormulario(ficha));

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Reabrir descarta rascunho e volta ao que está salvo.
  function onOpenChange(v: boolean) {
    if (v) setForm(paraFormulario(ficha));
    setOpen(v);
  }

  async function handleCepBlur() {
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

  function salvar() {
    startTransition(async () => {
      const res = await atualizarColaborador(profileId, form);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Ficha atualizada.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil className="size-3.5" /> Editar
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar ficha</DialogTitle>
          <DialogDescription>
            Alterações feitas aqui valem na hora. Cargo e aprovação continuam em
            “Gerenciar”.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Secao titulo="Dados pessoais">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nome completo" value={form.nome_completo} onChange={set("nome_completo")} />
              <Campo
                label="Nome de tio"
                value={form.nome_tio}
                onChange={set("nome_tio")}
                placeholder="Ex.: Tio Léo"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                label="RG"
                value={form.rg}
                onChange={(v) => set("rg")(formatRG(v))}
                placeholder="00.000.000-0"
              />
              <Campo
                label="CPF"
                value={form.cpf}
                inputMode="numeric"
                onChange={(v) => set("cpf")(formatCPF(v))}
                placeholder="000.000.000-00"
              />
            </div>
            <Campo
              label="CNPJ"
              value={form.cnpj}
              inputMode="numeric"
              onChange={(v) => set("cnpj")(formatCNPJ(v))}
              placeholder="00.000.000/0000-00"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                label="E-mail"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="voce@email.com"
              />
              <Campo
                label="Celular"
                type="tel"
                inputMode="numeric"
                value={form.celular}
                onChange={(v) => set("celular")(formatPhoneBR(v))}
                placeholder="(11) 90000-0000"
              />
            </div>
          </Secao>

          <Secao titulo="Endereço">
            <div className="grid gap-4 sm:grid-cols-[160px_1fr_90px]">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  inputMode="numeric"
                  value={form.cep}
                  onChange={(e) => set("cep")(formatCEP(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                />
              </div>
              <Campo label="Logradouro" value={form.logradouro} onChange={set("logradouro")} />
              <Campo label="Número" value={form.numero} onChange={set("numero")} />
            </div>
            {buscandoCep && (
              <p className="text-xs text-muted-foreground">Buscando endereço…</p>
            )}
            <Campo label="Complemento" value={form.complemento} onChange={set("complemento")} />
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_80px]">
              <Campo label="Bairro" value={form.bairro} onChange={set("bairro")} />
              <Campo label="Cidade" value={form.cidade} onChange={set("cidade")} />
              <Campo
                label="UF"
                value={form.uf}
                maxLength={2}
                onChange={(v) => set("uf")(v.toUpperCase())}
              />
            </div>
          </Secao>

          <Secao titulo="Pagamento">
            <Campo
              label="Chave PIX"
              value={form.chave_pix}
              onChange={set("chave_pix")}
              placeholder="CPF, celular, e-mail ou chave aleatória"
            />
          </Secao>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={salvar}
            disabled={pending}
            className="bg-verde font-semibold text-white hover:bg-verde-escuro"
          >
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Campo({
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
