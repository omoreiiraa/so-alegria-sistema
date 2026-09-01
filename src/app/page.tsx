import { redirect } from "next/navigation";

/**
 * O sistema não tem página pública de apresentação: só o escritório entra, e os
 * colaboradores chegam por /cadastro/[token] ou /convite/[token].
 * Quem já tem sessão é mandado de /login para /admin pelo middleware.
 */
export default function Home() {
  redirect("/login");
}
