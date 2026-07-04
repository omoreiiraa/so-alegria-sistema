"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { atualizarPerfil, atualizarSenha } from "@/actions/perfil";
import { formatPhoneBR } from "@/lib/utils/phone";
import { formatCEP, lookupCep } from "@/lib/utils/cep";

type Initial = {
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

export function PerfilEditForm({ initial }: { initial: Initial }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<Initial>({
    ...initial,
    celular: initial.celular ? formatPhoneBR(initial.celular) : "",
  });
  const [buscandoCep, setBuscandoCep] = useState(false);

  const set = (k: keyof Initial) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

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
      const res = await atualizarPerfil(form);
      if (res?.error) toast.error(res.error);
      else toast.success("Dados atualizados!");
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Meus dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              type="tel"
              inputMode="numeric"
              value={form.celular}
              onChange={(e) => set("celular")(formatPhoneBR(e.target.value))}
              placeholder="(11) 90000-0000"
            />
          </div>

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
            <TextField label="Logradouro" value={form.logradouro} onChange={set("logradouro")} />
            <TextField label="Número" value={form.numero} onChange={set("numero")} />
          </div>
          <TextField label="Complemento" value={form.complemento} onChange={set("complemento")} />
          <div className="grid grid-cols-[1fr_1fr_70px] gap-3">
            <TextField label="Bairro" value={form.bairro} onChange={set("bairro")} />
            <TextField label="Cidade" value={form.cidade} onChange={set("cidade")} />
            <TextField
              label="UF"
              value={form.uf}
              maxLength={2}
              onChange={(v) => set("uf")(v.toUpperCase())}
            />
          </div>

          <TextField
            label="Chave PIX"
            value={form.chave_pix}
            onChange={set("chave_pix")}
          />

          <Button
            onClick={salvar}
            disabled={pending}
            className="w-full bg-verde font-semibold text-white hover:bg-verde-escuro"
          >
            {pending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>

      <SenhaCard />
    </div>
  );
}

function SenhaCard() {
  const [pending, startTransition] = useTransition();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  function trocar() {
    startTransition(async () => {
      const res = await atualizarSenha({ senha, confirmar_senha: confirmar });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Senha atualizada!");
        setSenha("");
        setConfirmar("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Trocar senha</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nova_senha">Nova senha</Label>
          <PasswordInput
            id="nova_senha"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar_senha">Confirmar nova senha</Label>
          <PasswordInput
            id="confirmar_senha"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
        </div>
        <Button
          onClick={trocar}
          disabled={pending || senha.length < 8}
          variant="outline"
          className="w-full font-semibold"
        >
          {pending ? "Trocando…" : "Trocar senha"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TextField({
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
