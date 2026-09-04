"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gerarConvite } from "@/actions/links";
import { festaSchema, escalaSchema } from "@/lib/validations/festa";
import { onlyDigitsCep } from "@/lib/utils/cep";
import { toE164 } from "@/lib/utils/phone";
import type { PartyStatus } from "@/types/domain";

const STATUSES: PartyStatus[] = [
  "fechada",
  "escalada",
  "confirmada",
  "realizada",
  "paga",
  "cancelada",
];

function toRow(input: import("@/lib/validations/festa").FestaInput) {
  const usaParceiro = !!input.partner_id;
  return {
    fechada_por: input.fechada_por.trim(),
    data: input.data,
    hora_inicio: input.hora_inicio,
    hora_fim: input.hora_fim,
    party_type_id: input.party_type_ids[0], // primary selected type for backwards compatibility
    contratante_nome: input.contratante_nome || null,
    aniversariante_nome: input.aniversariante_nome || null,
    aniversariante_idade: input.aniversariante_idade ?? null,
    qtd_criancas: input.qtd_criancas ?? null,
    is_viagem: input.is_viagem ?? false,
    observacoes: input.observacoes || null,
    valor_festa: input.valor_festa ?? null,
    observacoes_orcamento: input.observacoes_orcamento || null,
    telefone_contato: input.telefone_contato
      ? toE164(input.telefone_contato) ?? input.telefone_contato
      : null,
    tema_festa: input.tema_festa || null,
    qtd_recreadores: input.qtd_recreadores ?? null,
    partner_id: usaParceiro ? input.partner_id : null,
    cep: usaParceiro ? null : onlyDigitsCep(input.cep ?? "") || null,
    logradouro: usaParceiro ? null : input.logradouro || null,
    numero: usaParceiro ? null : input.numero || null,
    complemento: usaParceiro ? null : input.complemento || null,
    bairro: usaParceiro ? null : input.bairro || null,
    cidade: usaParceiro ? null : input.cidade || null,
    uf: usaParceiro ? null : (input.uf || "").toUpperCase() || null,
  };
}

async function syncVehicles(partyId: string, vehicleIds: string[]) {
  const supabase = await createClient();
  await supabase.from("party_vehicles").delete().eq("party_id", partyId);
  if (vehicleIds.length > 0) {
    await supabase
      .from("party_vehicles")
      .insert(vehicleIds.map((vehicle_id) => ({ party_id: partyId, vehicle_id })));
  }
}

async function syncPartyTypes(partyId: string, partyTypeIds: string[]) {
  const supabase = await createClient();
  await supabase.from("party_party_types").delete().eq("party_id", partyId);
  if (partyTypeIds.length > 0) {
    await supabase
      .from("party_party_types")
      .insert(partyTypeIds.map((party_type_id) => ({ party_id: partyId, party_type_id })));
  }
}

export async function criarFesta(input: unknown) {
  const parsed = festaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parties")
    .insert(toRow(parsed.data))
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível criar a festa." };

  await Promise.all([
    syncVehicles(data.id, parsed.data.vehicle_ids ?? []),
    syncPartyTypes(data.id, parsed.data.party_type_ids ?? [])
  ]);

  revalidatePath("/admin/festas");
  return { ok: true, id: data.id };
}

export async function atualizarFesta(id: string, input: unknown) {
  const parsed = festaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("parties").update(toRow(parsed.data)).eq("id", id);
  if (error) return { error: "Não foi possível salvar a festa." };

  await Promise.all([
    syncVehicles(id, parsed.data.vehicle_ids ?? []),
    syncPartyTypes(id, parsed.data.party_type_ids ?? [])
  ]);

  revalidatePath("/admin/festas");
  revalidatePath(`/admin/festas/${id}`);
  return { ok: true, id };
}

export async function mudarStatusFesta(id: string, status: PartyStatus) {
  if (!STATUSES.includes(status)) return { error: "Status inválido" };
  const supabase = await createClient();
  const { error } = await supabase.from("parties").update({ status }).eq("id", id);
  if (error) return { error: "Não foi possível mudar o status." };
  revalidatePath("/admin/festas");
  revalidatePath(`/admin/festas/${id}`);
  return { ok: true };
}

export async function excluirFesta(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("parties").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir a festa." };
  revalidatePath("/admin/festas");
  return { ok: true };
}

export async function escalarColaborador(input: unknown) {
  const parsed = escalaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".") ?? "unknown";
    const msg = issue?.message ?? "Dados inválidos";
    return { error: `Campo [${path}]: ${msg}` };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { data: criado, error } = await supabase
    .from("party_assignments")
    .insert({
      party_id: d.party_id,
      profile_id: d.profile_id,
      presence_mode: d.presence_mode,
      horario_apresentacao: d.horario_apresentacao ?? null,
      is_driver: d.is_driver ?? false,
      vehicle_id: d.vehicle_id ?? null,
      cache_custom: d.cache_custom ?? null,
    })
    .select("id")
    .single();
  if (error || !criado) {
    if (error?.code === "23505") return { error: "Este colaborador já está escalado." };
    return { error: "Não foi possível escalar." };
  }

  // O convite de 24h nasce junto com a escalação: o admin só precisa enviá-lo.
  const convite = await gerarConvite(criado.id, d.party_id);

  // avança a festa para 'escalada' quando ainda está 'fechada'
  const { data: festa } = await supabase
    .from("parties")
    .select("status")
    .eq("id", d.party_id)
    .single();
  if (festa?.status === "fechada") {
    await supabase.from("parties").update({ status: "escalada" }).eq("id", d.party_id);
  }

  revalidatePath(`/admin/festas/${d.party_id}`);
  revalidatePath("/admin/festas");
  return "error" in convite
    ? { ok: true }
    : {
        ok: true,
        url: convite.url,
        linkId: convite.linkId,
        expiraEm: convite.expiraEm,
      };
}

export async function removerEscalado(assignmentId: string, partyId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("party_assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) return { error: "Não foi possível remover." };
  revalidatePath(`/admin/festas/${partyId}`);
  return { ok: true };
}
