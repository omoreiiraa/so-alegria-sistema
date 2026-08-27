"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submeterCadastro } from "@/actions/links";
import { formatPhoneBR, formatPhoneNational } from "@/lib/utils/phone";
import { formatCEP, lookupCep } from "@/lib/utils/cep";
import { formatCPF } from "@/lib/utils/cpf";
import { formatRG } from "@/lib/utils/rg";
import type { CadastroAtual } from "@/types/domain";

type Form = {
  nome_completo: string;
  rg: string;
  cpf: string;
  email: string;
  celular: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  chave_pix: string;
};

export function CadastroForm({
  token,
  atualizacao,
  inicial,
}: {
  token: string;
  /** true quando o cadastro já existe e este link é só para corrigir dados */
  atualizacao: boolean;
  inicial: CadastroAtual;
}) {
  const [pending, startTransition] = useTransition();
  const [pronto, setPronto] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [form, setForm] = useState<Form>({
    nome_completo: inicial.nome_completo ?? "",
    rg: inicial.rg ? formatRG(inicial.rg) : "",
    cpf: inicial.cpf ? formatCPF(inicial.cpf) : "",
    email: inicial.email ?? "",
    celular: inicial.celular ? formatPhoneNational(inicial.celular) : "",
    cep: inicial.cep ? formatCEP(inicial.cep) : "",
    logradouro: inicial.logradouro ?? "",
    numero: inicial.numero ?? "",
    complemento: inicial.complemento ?? "",
    bairro: inicial.bairro ?? "",
    cidade: inicial.cidade ?? "",
    uf: inicial.uf ?? "",
    chave_pix: inicial.chave_pix ?? "",
  });

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

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

  function enviar() {
    startTransition(async () => {
      const res = await submeterCadastro(token, form);
      if (res?.error) toast.error(res.error);
      else setPronto(true);
    });
  }

  if (pronto) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <CheckCircle2 className="size-7 text-verde" />
          <h2 className="font-display text-lg font-bold">
            {atualizacao ? "Dados atualizados!" : "Cadastro enviado!"}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {atualizacao
              ? "O escritório já está vendo os dados novos. Qualquer coisa, a gente chama no WhatsApp."
              : "O escritório vai revisar seus dados. Quando você for escalado numa festa, o convite chega no seu WhatsApp."}
          </p>
          <p className="text-xs text-muted-foreground">Pode fechar esta página.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Campo label="Nome completo" value={form.nome_completo} onChange={set("nome_completo")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              label="RG"
              value={form.rg}
              inputMode="text"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            {buscandoCep && (
              <p className="text-xs text-muted-foreground">Buscando endereço…</p>
            )}
          </div>
          <div className="grid grid-cols-[1fr_90px] gap-3">
            <Campo label="Logradouro" value={form.logradouro} onChange={set("logradouro")} />
            <Campo label="Número" value={form.numero} onChange={set("numero")} />
          </div>
          <Campo label="Complemento" value={form.complemento} onChange={set("complemento")} />
          <div className="grid grid-cols-[1fr_1fr_70px] gap-3">
            <Campo label="Bairro" value={form.bairro} onChange={set("bairro")} />
            <Campo label="Cidade" value={form.cidade} onChange={set("cidade")} />
            <Campo
              label="UF"
              value={form.uf}
              maxLength={2}
              onChange={(v) => set("uf")(v.toUpperCase())}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Campo
            label="Chave PIX"
            value={form.chave_pix}
            onChange={set("chave_pix")}
            placeholder="CPF, celular, e-mail ou chave aleatória"
          />
          <p className="text-xs text-muted-foreground">
            É nesta chave que os cachês das festas serão pagos.
          </p>
        </CardContent>
      </Card>

      <Button
        onClick={enviar}
        disabled={pending}
        className="w-full bg-verde font-semibold text-white hover:bg-verde-escuro"
      >
        {pending
          ? "Enviando…"
          : atualizacao
            ? "Salvar alterações"
            : "Enviar cadastro"}
      </Button>
    </div>
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
