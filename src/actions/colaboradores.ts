"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { editarColaboradorSchema } from "@/lib/validations/cadastro";
import { toE164 } from "@/lib/utils/phone";
import { onlyDigitsCep } from "@/lib/utils/cep";
import { onlyDigits } from "@/lib/utils/cpf";
import { onlyRg } from "@/lib/utils/rg";
import type { CargoType } from "@/types/domain";

function revalidate() {
  // "layout" cobre a lista e a ficha de cada colaborador.
  revalidatePath("/admin/colaboradores", "layout");
  revalidatePath("/admin");
}

/** Aprova o cadastro e define o cargo. */
export async function aprovarColaborador(profileId: string, cargo: CargoType) {
  if (cargo === "pendente") return { error: "Escolha um cargo para aprovar." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_user", {
    p_profile: profileId,
    p_cargo: cargo,
  });
  if (error) return { error: "Não foi possível aprovar." };
  revalidate();
  return { ok: true };
}

export async function definirCargo(profileId: string, cargo: CargoType) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_cargo", {
    p_profile: profileId,
    p_cargo: cargo,
  });
  if (error) return { error: "Não foi possível alterar o cargo." };
  revalidate();
  return { ok: true };
}

export async function definirNomeTio(profileId: string, nome: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_nome_tio", {
    p_profile: profileId,
    p_nome: nome,
  });
  if (error) return { error: "Não foi possível salvar o nome de tio." };
  revalidate();
  return { ok: true };
}

export async function definirAtivo(profileId: string, ativo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", {
    p_profile: profileId,
    p_ativo: ativo,
  });
  if (error) return { error: "Não foi possível atualizar o status." };
  revalidate();
  return { ok: true };
}

/**
 * Exclui a ficha em definitivo. O banco recusa se houver festa ou pagamento
 * ligado ao colaborador — nesses casos o caminho é desativar.
 */
export async function excluirColaborador(profileId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_colaborador", {
    p_profile: profileId,
  });
  if (error) {
    // 23503 = tem histórico; a mensagem do banco já explica o porquê.
    if (error.code === "23503") return { error: error.message };
    return { error: "Não foi possível excluir." };
  }
  revalidate();
  return { ok: true };
}

/** Campo de texto opcional: string vazia vira null, para a ficha não guardar "". */
function ouNulo(v: string | undefined) {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

/**
 * Edição manual da ficha pelo admin — o colaborador pede para trocar telefone,
 * PIX ou endereço e o escritório ajusta na hora, sem depender do link.
 *
 * O update lista as colunas uma a uma de propósito: `role`, `cargo`, `aprovado` e
 * `ativo` ficam de fora e continuam só nas RPCs `SECURITY DEFINER` (regra 3).
 */
export async function atualizarColaborador(profileId: string, input: unknown) {
  await requireAdmin();
  const parsed = editarColaboradorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  let celular: string | null = null;
  if (d.celular !== "") {
    celular = toE164(d.celular);
    if (!celular) return { error: "Celular inválido (inclua o DDD)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      nome_completo: d.nome_completo.trim(),
      nome_tio: ouNulo(d.nome_tio),
      rg: d.rg === "" ? null : onlyRg(d.rg),
      cpf: d.cpf === "" ? null : onlyDigits(d.cpf),
      email: d.email === "" ? null : d.email.toLowerCase(),
      celular,
      cep: d.cep === "" ? null : onlyDigitsCep(d.cep),
      logradouro: ouNulo(d.logradouro),
      numero: ouNulo(d.numero),
      complemento: ouNulo(d.complemento),
      bairro: ouNulo(d.bairro),
      cidade: ouNulo(d.cidade),
      uf: d.uf === "" ? null : d.uf.toUpperCase(),
      chave_pix: ouNulo(d.chave_pix),
    })
    .eq("id", profileId)
    .eq("role", "colaborador");

  if (error) {
    if (error.code === "23505") return { error: "Este CPF já está em outro cadastro." };
    return { error: "Não foi possível salvar as alterações." };
  }
  revalidate();
  return { ok: true };
}
