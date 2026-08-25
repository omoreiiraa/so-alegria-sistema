"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { atualizarSenha } from "@/actions/auth";

export function TrocarSenhaForm() {
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
