"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEquipe } from "@/lib/auth";
import { novoToken, hashToken, urlDoLink, expiraEmDoConvite } from "@/lib/links";
import { toE164 } from "@/lib/utils/phone";
import { onlyDigitsCep } from "@/lib/utils/cep";
import { onlyDigits } from "@/lib/utils/cpf";
import { onlyRg } from "@/lib/utils/rg";
import {
  cadastroColaboradorSchema,
  novoColaboradorSchema,
} from "@/lib/validations/cadastro";
import type { LinkTipo, LinkResolvido } from "@/types/domain";

// ---------------------------------------------------------------------------
// Admin — geração dos links
// ---------------------------------------------------------------------------

/**
 * Emite um link novo e revoga os anteriores do mesmo alvo que ainda estavam de pé.
 * Só o token em claro devolvido aqui abre a página; o banco guarda o hash.
 */
async function emitirLink(args: {
  tipo: LinkTipo;
  profileId: string;
  assignmentId?: string;
}): Promise<{ url: string; linkId: string; expiraEm: string | null } | { error: string }> {
  const session = await requireEquipe();
  const supabase = await createClient();

  const alvo = supabase
    .from("colaborador_links")
    .update({ revogado_em: new Date().toISOString() })
    .eq("tipo", args.tipo)
    .is("usado_em", null)
    .is("revogado_em", null);

  const { error: revogaErro } = args.assignmentId
    ? await alvo.eq("party_assignment_id", args.assignmentId)
    : await alvo.eq("profile_id", args.profileId);
  if (revogaErro) return { error: "Não foi possível revogar o link anterior." };

  const token = novoToken();
  const expiraEm = args.tipo === "convite" ? expiraEmDoConvite() : null;
  // O id volta junto: é a chave com que o navegador do admin lembra o link,
  // já que o token em claro não pode ser relido do banco.
  const { data, error } = await supabase
    .from("colaborador_links")
    .insert({
      tipo: args.tipo,
      token_hash: hashToken(token),
      profile_id: args.profileId,
      party_assignment_id: args.assignmentId ?? null,
      expira_em: expiraEm,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível gerar o link." };

  return { url: urlDoLink(args.tipo, token), linkId: data.id, expiraEm };
}

/** Abre a ficha do colaborador e já devolve o link de cadastro. */
export async function criarColaborador(input: unknown) {
  await requireEquipe();
  const parsed = novoColaboradorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const celular = toE164(parsed.data.celular);
  if (!celular) return { error: "Celular inválido (inclua o DDD)." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      nome_completo: parsed.data.nome_completo.trim(),
      celular,
      role: "colaborador",
      cargo: "pendente",
      aprovado: false,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível criar o colaborador." };

  const link = await emitirLink({ tipo: "cadastro", profileId: data.id });
  revalidatePath("/admin/colaboradores");
  if ("error" in link) return link;
  return { ok: true, profileId: data.id, url: link.url };
}

export async function gerarLinkCadastro(profileId: string) {
  const res = await emitirLink({ tipo: "cadastro", profileId });
  // "layout" pega a lista e a ficha do colaborador de uma vez.
  revalidatePath("/admin/colaboradores", "layout");
  return res;
}

export async function gerarConvite(assignmentId: string, partyId: string) {
  await requireEquipe();
  const supabase = await createClient();
  const { data } = await supabase
    .from("party_assignments")
    .select("profile_id")
    .eq("id", assignmentId)
    .single();
  if (!data) return { error: "Escalação não encontrada." };

  const res = await emitirLink({
    tipo: "convite",
    profileId: data.profile_id,
    assignmentId,
  });
  revalidatePath(`/admin/festas/${partyId}`);
  return res;
}

export async function revogarLink(linkId: string) {
  await requireEquipe();
  const supabase = await createClient();
  const { error } = await supabase
    .from("colaborador_links")
    .update({ revogado_em: new Date().toISOString() })
    .eq("id", linkId);
  if (error) return { error: "Não foi possível revogar." };
  revalidatePath("/admin/colaboradores", "layout");
  revalidatePath("/admin/festas", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Público — sem sessão. Passa por RPC validado, nunca toca a tabela direto.
// ---------------------------------------------------------------------------

/** Lê o estado do link sem consumi-lo. Usado pelas páginas públicas. */
export async function lerLink(token: string): Promise<LinkResolvido> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("resolve_link", {
    p_token_hash: hashToken(token),
  });
  if (error || !data) return { estado: "inexistente" };
  return data as unknown as LinkResolvido;
}

export async function submeterCadastro(token: string, input: unknown) {
  const parsed = cadastroColaboradorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;
  const celular = toE164(d.celular);
  if (!celular) return { error: "Celular inválido (inclua o DDD)." };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("submit_cadastro_by_token", {
    p_token_hash: hashToken(token),
    p_dados: {
      nome_completo: d.nome_completo.trim(),
      rg: onlyRg(d.rg),
      cpf: onlyDigits(d.cpf),
      cnpj: d.cnpj ? onlyDigits(d.cnpj) : "",
      email: d.email.trim().toLowerCase(),
      celular,
      cep: onlyDigitsCep(d.cep),
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento ?? "",
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf.toUpperCase(),
      chave_pix: d.chave_pix,
    },
  });
  if (error) {
    // 23505 = CPF já cadastrado (unique em profiles.cpf).
    if (error.code === "23505") return { error: "Este CPF já está cadastrado." };
    return { error: "Não foi possível salvar. O link pode ter expirado." };
  }
  revalidatePath("/admin/colaboradores");
  return { ok: true };
}

export async function responderConvite(
  token: string,
  aceita: boolean,
  motivo?: string,
) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("responder_convite_by_token", {
    p_token_hash: hashToken(token),
    p_aceita: aceita,
    p_motivo: motivo?.trim() ? motivo.trim() : undefined,
  });
  if (error) {
    return { error: "Não foi possível registrar a resposta. O link pode ter expirado." };
  }
  revalidatePath("/admin/festas", "layout");
  return { ok: true };
}
