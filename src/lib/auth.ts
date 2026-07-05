import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

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

/** Exige sessão de colaborador aprovado; redireciona conforme o estado. */
export async function requireColaborador(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile.ativo) redirect("/login");
  if (!session.profile.aprovado) redirect("/app/aguardando-aprovacao");
  return session;
}

/** Exige sessão de admin; caso contrário redireciona. */
export async function requireAdmin(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/app");
  return session;
}
