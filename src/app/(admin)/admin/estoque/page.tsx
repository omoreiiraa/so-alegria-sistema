import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { EstoqueManager, type ItemEstoque } from "@/components/admin/estoque-manager";

export const metadata: Metadata = { title: "Estoque" };

export default async function EstoquePage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: itens }, { data: psi }] = await Promise.all([
    supabase
      .from("stock_items")
      .select("id, nome, categoria, quantidade_total, foto_url")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("party_stock_items")
      .select("stock_item_id, qtd_levada, qtd_devolvida, qtd_perdida"),
  ]);

  // "em uso" = levado ainda não devolvido (descontando perdas)
  const emUso = new Map<string, number>();
  for (const r of psi ?? []) {
    const out = r.qtd_levada - (r.qtd_devolvida ?? 0) - r.qtd_perdida;
    if (out > 0) emUso.set(r.stock_item_id, (emUso.get(r.stock_item_id) ?? 0) + out);
  }

  // URLs assinadas para as fotos (bucket privado)
  const paths = (itens ?? []).map((i) => i.foto_url).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage.from("estoque").createSignedUrls(paths, 3600);
    for (const u of urls ?? []) {
      if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
  }

  const mapped: ItemEstoque[] = (itens ?? []).map((i) => {
    const usado = emUso.get(i.id) ?? 0;
    return {
      id: i.id,
      nome: i.nome,
      categoria: i.categoria,
      quantidade_total: i.quantidade_total,
      emUso: usado,
      disponivel: i.quantidade_total - usado,
      fotoPath: i.foto_url,
      fotoUrl: i.foto_url ? (signed.get(i.foto_url) ?? null) : null,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        description="Materiais da empresa: disponível, em uso nas festas e total."
      />
      <EstoqueManager itens={mapped} />
    </div>
  );
}
