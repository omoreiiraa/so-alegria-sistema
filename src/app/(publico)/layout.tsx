import { Wordmark } from "@/components/brand/wordmark";

/**
 * Área aberta, alcançada só por link tokenizado enviado no WhatsApp.
 * Sem sessão, sem navegação — o colaborador entra, resolve e sai.
 */
export default function PublicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4">
          <Wordmark className="text-xl" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        Só Alegria — Recreação e Discoteca
      </footer>
    </div>
  );
}
