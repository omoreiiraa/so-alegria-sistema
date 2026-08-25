"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CargoType } from "@/types/domain";

function revalidate() {
  revalidatePath("/admin/colaboradores");
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
