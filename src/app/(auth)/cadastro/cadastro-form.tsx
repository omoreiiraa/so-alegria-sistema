"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { cadastrar, type ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/common/password-input";
import { formatCPF } from "@/lib/utils/cpf";
import { formatRG } from "@/lib/utils/rg";
import { formatPhoneBR } from "@/lib/utils/phone";
import { formatCEP, lookupCep } from "@/lib/utils/cep";

export function CadastroForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    cadastrar,
    undefined,
  );
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [celular, setCelular] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState({
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "",
  });
  const [buscandoCep, setBuscandoCep] = useState(false);

  async function handleCepBlur() {
    if (cep.replace(/\D/g, "").length !== 8) return;
    setBuscandoCep(true);
    const found = await lookupCep(cep);
    if (found) {
      setEndereco({
        logradouro: found.logradouro,
        bairro: found.bairro,
        cidade: found.cidade,
        uf: found.uf,
      });
    }
    setBuscandoCep(false);
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Dados pessoais
        </h2>
        <Field label="Nome completo" name="nome_completo" autoComplete="name" required />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              name="cpf"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rg">RG</Label>
            <Input
              id="rg"
              name="rg"
              inputMode="text"
              value={rg}
              onChange={(e) => setRg(formatRG(e.target.value))}
              placeholder="00.000.000-0"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="E-mail" name="email" type="email" autoComplete="email" required />
          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              name="celular"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={celular}
              onChange={(e) => setCelular(formatPhoneBR(e.target.value))}
              placeholder="(11) 90000-0000"
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Endereço
        </h2>
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            name="cep"
            inputMode="numeric"
            value={cep}
            onChange={(e) => setCep(formatCEP(e.target.value))}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            required
          />
          {buscandoCep && (
            <p className="text-xs text-muted-foreground">Buscando endereço…</p>
          )}
        </div>
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field
            label="Logradouro"
            name="logradouro"
            value={endereco.logradouro}
            onChange={(v) => setEndereco((e) => ({ ...e, logradouro: v }))}
            required
          />
          <Field label="Número" name="numero" required />
        </div>
        <Field label="Complemento" name="complemento" />
        <div className="grid grid-cols-[1fr_1fr_80px] gap-3">
          <Field
            label="Bairro"
            name="bairro"
            value={endereco.bairro}
            onChange={(v) => setEndereco((e) => ({ ...e, bairro: v }))}
            required
          />
          <Field
            label="Cidade"
            name="cidade"
            value={endereco.cidade}
            onChange={(v) => setEndereco((e) => ({ ...e, cidade: v }))}
            required
          />
          <Field
            label="UF"
            name="uf"
            maxLength={2}
            value={endereco.uf}
            onChange={(v) => setEndereco((e) => ({ ...e, uf: v.toUpperCase() }))}
            required
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Pagamento e acesso
        </h2>
        <Field
          label="Chave PIX"
          name="chave_pix"
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <PasswordInput
              id="senha"
              name="senha"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar_senha">Confirmar senha</Label>
            <PasswordInput
              id="confirmar_senha"
              name="confirmar_senha"
              autoComplete="new-password"
              required
            />
          </div>
        </div>
      </section>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-laranja text-base font-bold text-white hover:bg-laranja-escuro"
      >
        {pending ? "Enviando…" : "Criar conta"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Após o cadastro, o escritório vai aprovar seu acesso e definir seu cargo.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-verde-escuro hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  ...props
}: {
  label: string;
  name: string;
  value?: string;
  onChange?: (v: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        {...(controlled
          ? { value, onChange: (e) => onChange!(e.target.value) }
          : {})}
        {...props}
      />
    </div>
  );
}
