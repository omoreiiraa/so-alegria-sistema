"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { eEquipe } from "@/types/domain";

const followUpSchema = z.object({
  partyId: z.uuid(),
  texto: z
    .string()
    .trim()
    .min(1, "Escreva o follow-up.")
    .max(2000, "Máximo de 2000 caracteres."),
});

/**
 * Registra um follow-up na festa. O autor é sempre quem está logado — a
 * policy `follow_ups_insert` confere o mesmo no banco (ADR-0029).
 */
export async function adicionarFollowUp(partyId: string, texto: string) {
  const parsed = followUpSchema.safeParse({ partyId, texto });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const session = await getSessionProfile();
  if (!session || !eEquipe(session.profile.role)) return { error: "Não autorizado" };

  const supabase = await createClient();
  const { error } = await supabase.from("party_follow_ups").insert({
    party_id: parsed.data.partyId,
    autor_id: session.profile.id,
    texto: parsed.data.texto,
  });
  if (error) return { error: "Não foi possível salvar o follow-up." };

  revalidatePath(`/admin/festas/${parsed.data.partyId}`);
  return { ok: true };
}

/** Apaga um follow-up. A RLS só deixa apagar o próprio (ou a gestão, qualquer um). */
export async function excluirFollowUp(id: string, partyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("party_follow_ups")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível apagar este follow-up." };
  revalidatePath(`/admin/festas/${partyId}`);
  return { ok: true };
}
