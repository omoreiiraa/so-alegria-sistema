"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Marca uma data como disponível para o colaborador logado. */
export async function addAvailability(dateISO: string) {
  if (!ISO_DATE.test(dateISO)) return { error: "Data inválida" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada" };

  const { error } = await supabase
    .from("availability")
    .upsert(
      { user_id: user.id, data: dateISO },
      { onConflict: "user_id,data", ignoreDuplicates: true },
    );
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/app/disponibilidade");
  return { ok: true };
}

/** Remove a marcação de disponibilidade de uma data. */
export async function removeAvailability(dateISO: string) {
  if (!ISO_DATE.test(dateISO)) return { error: "Data inválida" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada" };

  const { error } = await supabase
    .from("availability")
    .delete()
    .eq("user_id", user.id)
    .eq("data", dateISO);
  if (error) return { error: "Não foi possível remover." };
  revalidatePath("/app/disponibilidade");
  return { ok: true };
}
