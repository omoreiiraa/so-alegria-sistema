import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/domain";
import { eDona, eEquipe, eGestao, ROTA_INICIAL } from "@/types/domain";

export type SessionProfile = {
  userId: string;
  email: string | null;
  profile: Profile;
};

/**
 * Retorna o usuário logado + seu profile, ou null se não houver sessão.
 * Envolto em `cache()` para deduplicar por request — o layout e a página
 * compartilham o mesmo resultado (uma única chamada a getUser + profiles).
 */
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) return null;
    return { userId: user.id, email: user.email ?? null, profile };
  },
);

/**
 * Guarda de rota por papel. Quem não tem sessão vai para o login; quem tem, mas
 * não alcança esta tela (Pagamentos e OS, que são da gestão), volta para o
 * painel — mandar de novo ao login seria mentira, a sessão está de pé.
 */
async function exigir(
  autorizado: (role: UserRole) => boolean,
): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const { role } = session.profile;
  if (!autorizado(role)) {
    redirect(eEquipe(role) ? ROTA_INICIAL : "/login");
  }
  return session;
}

/** Qualquer pessoa do escritório com login. Cobre a operação inteira. */
export const requireEquipe = () => exigir(eEquipe);

/** Dinheiro e Ordem de Serviço — o que o funcionário não alcança. */
export const requireGestao = () => exigir(eGestao);

/** Só a proprietária: mexer em papel de acesso das outras. */
export const requireDona = () => exigir(eDona);
