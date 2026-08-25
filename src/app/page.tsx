import Link from "next/link";
import { Wordmark, BrandBadge } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

const features = [
  { emoji: "🗓️", titulo: "Sua escala", texto: "Veja suas festas, horários e locais num só lugar." },
  { emoji: "✅", titulo: "Confirme em 2 toques", texto: "Aceite ou recuse convites direto pelo celular." },
  { emoji: "💰", titulo: "Pagamentos", texto: "Acompanhe o que você tem a receber toda segunda." },
];

export default function LandingPage() {
  return (
    <main className="theme-app relative flex min-h-dvh flex-col bg-background text-foreground">
      {/* topo */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <BrandBadge className="size-9" />
          <Wordmark className="text-lg" subtitle={false} />
        </div>
        <Button
          render={<Link href="/login" />}
          variant="ghost"
          className="font-semibold"
        >
          Entrar
        </Button>
      </header>

      {/* herói */}
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 py-12 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-verde/20 bg-verde/10 px-3.5 py-1.5 text-sm font-semibold text-verde-escuro">
          <span className="size-2 rounded-full bg-laranja" /> Plataforma da equipe
        </span>

        <Wordmark className="text-5xl sm:text-6xl" />

        <h1 className="mt-8 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Toda a sua rotina de festas, sem bagunça no WhatsApp.
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          Festas, escala, frota e pagamentos — tudo num só lugar. Os tios e tias
          recebem convite e cadastro por link no WhatsApp, sem precisar de conta.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button
            render={<Link href="/login" />}
            size="lg"
            className="h-12 bg-laranja px-8 text-base font-bold text-white hover:bg-laranja-escuro"
          >
            Entrar no painel
          </Button>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.titulo}
              className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm"
            >
              <div className="text-2xl">{f.emoji}</div>
              <h3 className="mt-3 font-display text-lg font-bold">{f.titulo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* assinatura: fita quadriculada (piso de discoteca) */}
      <div className="checker-strip w-full" />
      <footer className="mx-auto w-full max-w-5xl px-5 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Só Alegria · Recreação e Discoteca
      </footer>
    </main>
  );
}
