"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Colaborador confirma um convite de festa (RPC congela o snapshot de cachê). */
export async function confirmarConvite(assignmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_assignment", {
    p_assignment_id: assignmentId,
  });
  if (error) return { error: "Não foi possível confirmar. Tente novamente." };
  revalidatePath("/app");
  return { ok: true };
}

/** Colaborador recusa um convite (notifica o admin). */
export async function recusarConvite(assignmentId: string, motivo?: string) {
  const supabase = await createClient();
  const p_motivo = motivo && motivo.trim() ? motivo.trim() : undefined;
  const { error } = await supabase.rpc("refuse_assignment", {
    p_assignment_id: assignmentId,
    p_motivo,
  });
  if (error) return { error: "Não foi possível recusar. Tente novamente." };
  revalidatePath("/app");
  return { ok: true };
}

/** Colaborador cancela uma confirmação anterior (notifica o admin). */
export async function cancelarConfirmacao(assignmentId: string, motivo?: string) {
  const supabase = await createClient();
  const p_motivo = motivo && motivo.trim() ? motivo.trim() : undefined;
  const { error } = await supabase.rpc("cancel_assignment", {
    p_assignment_id: assignmentId,
    p_motivo,
  });
  if (error) return { error: "Não foi possível cancelar. Tente novamente." };
  revalidatePath("/app");
  return { ok: true };
}
