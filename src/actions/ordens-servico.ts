"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireGestao } from "@/lib/auth";
import type { ConfirmationMethod } from "@/types/domain";

const BUCKET = "ordens-servico";
const ROTA = "/admin/ordens-servico";

/** Gera a OS de uma escalação. A numeração sequencial por ano é feita no banco. */
export async function gerarOrdemServico(assignmentId: string) {
  await requireGestao();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_service_order", {
    p_assignment: assignmentId,
  });

  if (error) {
    if (error.code === "23505") return { error: "Esta escalação já tem uma OS." };
    return { error: "Não foi possível gerar a Ordem de Serviço." };
  }

  revalidatePath(ROTA);
  return { ok: true, id: (data as { id: string } | null)?.id };
}

export async function marcarOSEnviada(id: string) {
  await requireGestao();
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_orders")
    .update({ status: "enviada", enviada_em: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Não foi possível marcar como enviada." };
  revalidatePath(ROTA);
  return { ok: true };
}

const respostaSchema = z.object({
  aceita: z.boolean(),
  meio_confirmacao: z.enum(["whatsapp", "email", "assinatura_fisica"]),
  respondido_em: z.string().min(1, "Informe a data e hora da resposta"),
  motivo_recusa: z.string().trim().optional().default(""),
});

/**
 * Registra a resposta do colaborador. O aceite acontece fora do sistema
 * (WhatsApp, e-mail ou assinatura física) e o admin registra aqui — é o que o
 * modelo da CONTRATANTE pede no bloco "CONFIRMAÇÃO DO CONTRATADO(A)".
 */
export async function registrarRespostaOS(id: string, input: unknown) {
  await requireGestao();
  const parsed = respostaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const d = parsed.data;

  const quando = new Date(d.respondido_em);
  if (Number.isNaN(quando.getTime())) return { error: "Data da resposta inválida" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_orders")
    .update({
      status: d.aceita ? "aceita" : "recusada",
      respondido_em: quando.toISOString(),
      meio_confirmacao: d.meio_confirmacao as ConfirmationMethod,
      motivo_recusa: d.aceita ? null : d.motivo_recusa || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível registrar a resposta." };
  revalidatePath(ROTA);
  return { ok: true };
}

/** Anexa o .docx já preenchido/assinado. Substitui o anterior, se houver. */
export async function anexarArquivoOS(id: string, formData: FormData) {
  await requireGestao();
  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: "Arquivo maior que 10 MB." };
  }

  const supabase = await createClient();
  const { data: os } = await supabase
    .from("service_orders")
    .select("ano, numero, arquivo_path")
    .eq("id", id)
    .single();
  if (!os) return { error: "Ordem de Serviço não encontrada." };

  const ext = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
  const path = `${os.ano}/OS-${String(os.numero).padStart(4, "0")}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) return { error: "Não foi possível enviar o arquivo." };

  const { error } = await supabase
    .from("service_orders")
    .update({ arquivo_path: path })
    .eq("id", id);
  if (error) return { error: "Arquivo enviado, mas não foi possível vinculá-lo." };

  // Remove o anterior só depois que o novo já está vinculado.
  if (os.arquivo_path) {
    await supabase.storage.from(BUCKET).remove([os.arquivo_path]);
  }

  revalidatePath(ROTA);
  return { ok: true };
}

/** URL assinada e temporária para baixar o anexo (o bucket é privado). */
export async function urlArquivoOS(id: string) {
  await requireGestao();
  const supabase = await createClient();
  const { data: os } = await supabase
    .from("service_orders")
    .select("arquivo_path")
    .eq("id", id)
    .single();
  if (!os?.arquivo_path) return { error: "Nenhum arquivo anexado." };

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(os.arquivo_path, 60);
  if (error || !data) return { error: "Não foi possível abrir o arquivo." };
  return { ok: true, url: data.signedUrl };
}

export async function removerArquivoOS(id: string) {
  await requireGestao();
  const supabase = await createClient();
  const { data: os } = await supabase
    .from("service_orders")
    .select("arquivo_path")
    .eq("id", id)
    .single();
  if (!os?.arquivo_path) return { error: "Nenhum arquivo anexado." };

  const { error } = await supabase
    .from("service_orders")
    .update({ arquivo_path: null })
    .eq("id", id);
  if (error) return { error: "Não foi possível remover o arquivo." };

  await supabase.storage.from(BUCKET).remove([os.arquivo_path]);
  revalidatePath(ROTA);
  return { ok: true };
}

export async function excluirOrdemServico(id: string) {
  await requireGestao();
  const supabase = await createClient();
  const { data: os } = await supabase
    .from("service_orders")
    .select("arquivo_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("service_orders").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir a OS." };

  if (os?.arquivo_path) {
    await supabase.storage.from(BUCKET).remove([os.arquivo_path]);
  }
  revalidatePath(ROTA);
  return { ok: true };
}
