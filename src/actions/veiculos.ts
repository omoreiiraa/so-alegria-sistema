"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const veiculoSchema = z.object({
  tipo: z.enum(["carro", "van"]),
  apelido: z.string().trim().min(1, "Informe um apelido"),
  placa: z.string().trim().optional().default(""),
  dia_rodizio: z.number().int().min(0).max(6).nullable().optional(),
  status: z.enum(["disponivel", "em_uso", "manutencao"]).optional().default("disponivel"),
});

function toRow(input: z.infer<typeof veiculoSchema>) {
  return {
    tipo: input.tipo,
    apelido: input.apelido,
    placa: input.placa ? input.placa.toUpperCase().replace(/\s/g, "") : null,
    dia_rodizio: input.dia_rodizio ?? null,
    status: input.status ?? "disponivel",
  };
}

export async function criarVeiculo(input: unknown) {
  const parsed = veiculoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").insert(toRow(parsed.data));
  if (error) {
    if (error.code === "23505") return { error: "Já existe um veículo com essa placa." };
    return { error: "Não foi possível salvar o veículo." };
  }
  revalidatePath("/admin/veiculos");
  return { ok: true };
}

export async function atualizarVeiculo(id: string, input: unknown) {
  const parsed = veiculoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update(toRow(parsed.data)).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Já existe um veículo com essa placa." };
    return { error: "Não foi possível salvar o veículo." };
  }
  revalidatePath("/admin/veiculos");
  return { ok: true };
}

export async function excluirVeiculo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir (pode estar vinculado a uma festa)." };
  revalidatePath("/admin/veiculos");
  return { ok: true };
}
