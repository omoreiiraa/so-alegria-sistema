"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "contratos";
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

/** PDF ou foto da folha assinada — é o que o cliente costuma devolver. */
const EXTENSOES = ["pdf", "jpg", "jpeg", "png"] as const;

function extensaoDe(nome: string): string | null {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  return (EXTENSOES as readonly string[]).includes(ext) ? ext : null;
}

/**
 * Anexa o orçamento preenchido/assinado devolvido pelo cliente. Substitui o
 * anterior, se houver — só depois que o novo já está vinculado, para uma falha
 * no meio não deixar a festa sem arquivo nenhum.
 */
export async function anexarOrcamentoAssinado(partyId: string, formData: FormData) {
  await requireAdmin();
  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > TAMANHO_MAXIMO) {
    return { error: "Arquivo maior que 10 MB." };
  }
  const ext = extensaoDe(file.name);
  if (!ext) {
    return { error: "Envie um PDF ou uma foto (JPG/PNG)." };
  }

  const supabase = await createClient();
  const { data: festa } = await supabase
    .from("parties")
    .select("orcamento_assinado_path")
    .eq("id", partyId)
    .single();
  if (!festa) return { error: "Festa não encontrada." };

  const path = `${partyId}/orcamento-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) return { error: "Não foi possível enviar o arquivo." };

  const { error } = await supabase
    .from("parties")
    .update({ orcamento_assinado_path: path })
    .eq("id", partyId);
  if (error) return { error: "Arquivo enviado, mas não foi possível vinculá-lo." };

  if (festa.orcamento_assinado_path) {
    await supabase.storage.from(BUCKET).remove([festa.orcamento_assinado_path]);
  }

  revalidatePath(`/admin/festas/${partyId}`);
  return { ok: true };
}

export async function removerOrcamentoAssinado(partyId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: festa } = await supabase
    .from("parties")
    .select("orcamento_assinado_path")
    .eq("id", partyId)
    .single();
  if (!festa?.orcamento_assinado_path) {
    return { error: "Nenhum arquivo anexado." };
  }

  const { error } = await supabase
    .from("parties")
    .update({ orcamento_assinado_path: null })
    .eq("id", partyId);
  if (error) return { error: "Não foi possível remover." };

  await supabase.storage.from(BUCKET).remove([festa.orcamento_assinado_path]);
  revalidatePath(`/admin/festas/${partyId}`);
  return { ok: true };
}

/** URL assinada e temporária para rever o que o cliente devolveu. */
export async function urlOrcamentoAssinado(partyId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: festa } = await supabase
    .from("parties")
    .select("orcamento_assinado_path")
    .eq("id", partyId)
    .single();
  if (!festa?.orcamento_assinado_path) {
    return { error: "Nenhum arquivo anexado." };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(festa.orcamento_assinado_path, 60);
  if (error || !data) return { error: "Não foi possível abrir o arquivo." };

  return { ok: true, url: data.signedUrl };
}
