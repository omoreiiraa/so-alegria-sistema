"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, senhaSchema } from "@/lib/validations/auth";

export type ActionState = { error?: string } | undefined;

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada." };
    }
    return { error: "E-mail ou senha incorretos." };
  }

  if (data.user?.app_metadata?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Esta conta não tem acesso ao painel." };
  }

  const next = formData.get("next") as string | null;
  if (next) redirect(next);
  redirect("/admin");
}

/** Troca a senha do admin logado (usada após o link de recuperação). */
export async function atualizarSenha(input: unknown) {
  const parsed = senhaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) return { error: "Não foi possível trocar a senha." };
  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
