import { cn } from "@/lib/utils";

/**
 * A marca da Só Alegria. O logo já traz "SÓ ALEGRIA · Recreação e Discoteca"
 * desenhado dentro dele, então não acompanha texto: repetir o nome ao lado
 * duplicava a marca e espremia a arte.
 *
 * Sem `aria-hidden`: como o nome só existe dentro da imagem, o `alt` é o que
 * leva a marca para o leitor de tela.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/soalegria.jpg"
      alt="Só Alegria — Recreação e Discoteca"
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}
