"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { perfilSchema, senhaSchema } from "@/lib/validations/perfil";
import { toE164 } from "@/lib/utils/phone";
import { onlyDigitsCep } from "@/lib/utils/cep";

/** Atualiza os campos que o colaborador pode editar (celular, endereço, PIX). */
export async function atualizarPerfil(input: unknown) {
  const parsed = perfilSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  const celular = toE164(d.celular);
  if (!celular) return { error: "Celular inválido (inclua o DDD)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada" };

  const { error } = await supabase
    .from("profiles")
    .update({
      celular,
      cep: onlyDigitsCep(d.cep),
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento ?? "",
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf.toUpperCase(),
      chave_pix: d.chave_pix,
    })
    .eq("user_id", user.id);

  if (error) return { error: "Não foi possível salvar. Tente novamente." };
  revalidatePath("/app/perfil");
  return { ok: true };
}

/** Troca a senha do usuário logado. */
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
