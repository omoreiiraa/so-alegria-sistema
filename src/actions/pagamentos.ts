"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Admin: gera/atualiza os pagamentos da semana (seg–dom). */
export async function fecharSemana(semanaInicio: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_payment_week", {
    p_semana_inicio: semanaInicio,
  });
  if (error) return { error: "Não foi possível fechar a semana." };
  revalidatePath("/admin/pagamentos");
  return { ok: true };
}

/** Admin: marca um pagamento como pago. */
export async function marcarPago(paymentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_payment_paid", {
    p_payment_id: paymentId,
  });
  if (error) return { error: "Não foi possível marcar como pago." };
  revalidatePath("/admin/pagamentos");
  return { ok: true };
}

/** Admin: marca vários pagamentos como pagos. */
export async function marcarTodosPagos(paymentIds: string[]) {
  const supabase = await createClient();
  for (const id of paymentIds) {
    const { error } = await supabase.rpc("mark_payment_paid", { p_payment_id: id });
    if (error) return { error: "Alguns pagamentos não puderam ser marcados." };
  }
  revalidatePath("/admin/pagamentos");
  return { ok: true };
}
