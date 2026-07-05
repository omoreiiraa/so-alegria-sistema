"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function marcarNotificacaoLida(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ lida: true })
    .eq("id", id);
  if (error) return { error: "Não foi possível atualizar." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function marcarTodasLidas() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ lida: true })
    .eq("lida", false);
  if (error) return { error: "Não foi possível atualizar." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}
