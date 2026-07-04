"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { onlyDigitsCep } from "@/lib/utils/cep";

const parceiroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do buffet"),
  cep: z.string().trim().optional().default(""),
  logradouro: z.string().trim().optional().default(""),
  numero: z.string().trim().optional().default(""),
  complemento: z.string().trim().optional().default(""),
  bairro: z.string().trim().optional().default(""),
  cidade: z.string().trim().optional().default(""),
  uf: z.string().trim().optional().default(""),
  contato: z.string().trim().optional().default(""),
  observacoes: z.string().trim().optional().default(""),
});

function toRow(d: z.infer<typeof parceiroSchema>) {
  return {
    nome: d.nome,
    cep: onlyDigitsCep(d.cep ?? "") || null,
    logradouro: d.logradouro || null,
    numero: d.numero || null,
    complemento: d.complemento || null,
    bairro: d.bairro || null,
    cidade: d.cidade || null,
    uf: (d.uf || "").toUpperCase() || null,
    contato: d.contato || null,
    observacoes: d.observacoes || null,
  };
}

export async function criarParceiro(input: unknown) {
  const parsed = parceiroSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await createClient();
  const { error } = await supabase.from("partners").insert(toRow(parsed.data));
  if (error) return { error: "Não foi possível salvar o buffet." };
  revalidatePath("/admin/parceiros");
  return { ok: true };
}

export async function atualizarParceiro(id: string, input: unknown) {
  const parsed = parceiroSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await createClient();
  const { error } = await supabase.from("partners").update(toRow(parsed.data)).eq("id", id);
  if (error) return { error: "Não foi possível salvar o buffet." };
  revalidatePath("/admin/parceiros");
  return { ok: true };
}

export async function excluirParceiro(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir (pode estar vinculado a uma festa)." };
  revalidatePath("/admin/parceiros");
  return { ok: true };
}
