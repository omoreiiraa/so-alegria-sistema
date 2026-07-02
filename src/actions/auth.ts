"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cadastroSchema, loginSchema } from "@/lib/validations/auth";
import { toE164 } from "@/lib/utils/phone";
import { onlyDigits } from "@/lib/utils/cpf";
import { onlyDigitsCep } from "@/lib/utils/cep";

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
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada." };
    }
    return { error: "E-mail ou senha incorretos." };
  }

  const next = (formData.get("next") as string) || "/app";
  redirect(next);
}

export async function cadastrar(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = cadastroSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  const celular = toE164(d.celular);
  if (!celular) return { error: "Celular inválido (inclua o DDD)." };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email: d.email,
    password: d.senha,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/app`,
      data: {
        nome_completo: d.nome_completo,
        rg: d.rg,
        cpf: onlyDigits(d.cpf),
        celular,
        cep: onlyDigitsCep(d.cep),
        logradouro: d.logradouro,
        numero: d.numero,
        complemento: d.complemento ?? "",
        bairro: d.bairro,
        cidade: d.cidade,
        uf: d.uf.toUpperCase(),
        chave_pix: d.chave_pix,
      },
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Já existe uma conta com este e-mail." };
    }
    if (error.message.toLowerCase().includes("cpf")) {
      return { error: "Este CPF já está cadastrado." };
    }
    return { error: "Não foi possível concluir o cadastro. Tente novamente." };
  }

  redirect(`/verificar-email?email=${encodeURIComponent(d.email)}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
