import type { Metadata } from "next";
import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandBadge, Wordmark } from "@/components/brand/wordmark";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

/**
 * 404 de rota inexistente, fora de qualquer área. Pode cair aqui tanto o
 * escritório quanto alguém que errou um link do WhatsApp, então o texto não
 * assume login nem manda para o painel — o botão vai para a raiz, que já
 * redireciona para o login (e de lá para /admin, se houver sessão).
 */
export default function NotFound() {
  return (
    <main className="theme-app flex min-h-dvh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-2.5 px-5 py-5">
        <BrandBadge className="size-9" />
        <Wordmark className="text-lg" subtitle={false} />
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MapPinOff className="size-6" />
        </div>

        <p className="font-display text-5xl font-extrabold tracking-tight text-verde">
          404
        </p>
        <h1 className="mt-3 font-display text-xl font-bold">
          Esta página não existe
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço pode ter sido digitado errado, ou o link veio cortado da
          mensagem. Confira se você copiou ele por inteiro.
        </p>

        <Button
          render={<Link href="/" />} nativeButton={false}
          className="mt-7 bg-laranja font-semibold text-white hover:bg-laranja-escuro"
        >
          Voltar ao início
        </Button>
      </section>

      <footer className="px-5 py-5 text-center text-xs text-muted-foreground">
        Só Alegria — Recreação e Discoteca
      </footer>
    </main>
  );
}
