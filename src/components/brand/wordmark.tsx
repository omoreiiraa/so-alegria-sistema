import { cn } from "@/lib/utils";

/** Marca "Só Alegria" com as cores do logo. Display font (Baloo 2). */
export function Wordmark({
  className,
  subtitle = true,
}: {
  className?: string;
  subtitle?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="font-display font-extrabold tracking-tight">
        <span className="text-vermelho">Só</span>{" "}
        <span className="text-verde">Alegria</span>
      </span>
      {subtitle && (
        <span className="mt-0.5 text-[0.62em] font-semibold uppercase tracking-[0.22em] text-laranja">
          Recreação e Discoteca
        </span>
      )}
    </span>
  );
}

/** Ícone/avatar circular da marca (imagem do logo). */
export function BrandBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-verde font-display text-lg font-extrabold text-white shadow-sm ring-2 ring-amarelo overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <img src="/soalegria.jpg" alt="Só Alegria" className="size-full object-cover" />
    </span>
  );
}
