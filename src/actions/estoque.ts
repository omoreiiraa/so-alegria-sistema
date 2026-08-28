"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item"),
  quantidade_total: z.number().int().min(0).max(1000000),
  categoria: z.string().trim().optional().default(""),
  foto_url: z.string().trim().optional().default(""),
});

function toRow(d: z.infer<typeof itemSchema>) {
  return {
    nome: d.nome,
    quantidade_total: d.quantidade_total,
    categoria: d.categoria || null,
    foto_url: d.foto_url || null,
  };
}

export async function criarItem(input: unknown) {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await createClient();
  const { error } = await supabase.from("stock_items").insert(toRow(parsed.data));
  if (error) return { error: "Não foi possível salvar o item." };
  revalidatePath("/admin/estoque");
  return { ok: true };
}

export async function atualizarItem(id: string, input: unknown) {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await createClient();
  const { error } = await supabase.from("stock_items").update(toRow(parsed.data)).eq("id", id);
  if (error) return { error: "Não foi possível salvar o item." };
  revalidatePath("/admin/estoque");
  return { ok: true };
}

/**
 * Remove o item de verdade quando ele nunca foi usado; quando já tem
 * movimentação, inativa **e zera a quantidade** — antes só inativava, e o
 * banco seguia contando um patrimônio que o escritório já tinha dado baixa.
 */
export async function removerItem(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_stock_item", { p_item: id });
  if (error) {
    // 23503 = ainda vinculado a alguma festa; a mensagem do banco diz quantas.
    if (error.code === "23503") return { error: error.message };
    return { error: "Não foi possível remover o item." };
  }
  revalidatePath("/admin/estoque");
  revalidatePath("/admin/festas", "layout");
  return { ok: true, apagado: data === "apagado" };
}

// ---- Materiais vinculados à festa (baixa temporária + devolução) ----

/** Vincula um item à festa (baixa temporária; trigger registra saida_festa). */
export async function vincularMaterial(partyId: string, stockItemId: string, qtd: number) {
  if (!Number.isInteger(qtd) || qtd <= 0) return { error: "Quantidade inválida" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("party_stock_items")
    .insert({ party_id: partyId, stock_item_id: stockItemId, qtd_levada: qtd });
  if (error) {
    if (error.code === "23505") return { error: "Este item já está na festa." };
    return { error: "Não foi possível vincular o item." };
  }
  revalidatePath(`/admin/festas/${partyId}`);
  revalidatePath("/admin/estoque");
  return { ok: true };
}

export async function removerMaterial(id: string, partyId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("party_stock_items").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover o item." };
  revalidatePath(`/admin/festas/${partyId}`);
  revalidatePath("/admin/estoque");
  return { ok: true };
}

/** Conferência de devolução: registra devolvido/perdido (trigger ajusta o estoque). */
export async function registrarDevolucao(
  id: string,
  partyId: string,
  qtdDevolvida: number,
  qtdPerdida: number,
) {
  if (qtdDevolvida < 0 || qtdPerdida < 0) return { error: "Valores inválidos" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("party_stock_items")
    .update({ qtd_devolvida: qtdDevolvida, qtd_perdida: qtdPerdida })
    .eq("id", id);
  if (error) return { error: "Não foi possível registrar a devolução." };
  revalidatePath(`/admin/festas/${partyId}`);
  revalidatePath("/admin/estoque");
  return { ok: true };
}
