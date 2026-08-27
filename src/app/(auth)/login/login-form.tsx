"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/common/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link
            href="/esqueci-senha"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Esqueci a senha
          </Link>
        </div>
        <PasswordInput
          id="senha"
          name="senha"
          autoComplete="current-password"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-laranja text-base font-bold text-white hover:bg-laranja-escuro"
      >
        {pending ? "Entrando…" : "Entrar"}
      </Button>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Acesso restrito ao escritório.
      </p>
    </form>
  );
}
