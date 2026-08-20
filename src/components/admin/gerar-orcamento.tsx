"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Baixa o PDF do orçamento e oferece o envio ao cliente pelo WhatsApp.
 * O PDF é gerado no servidor (rota /api/festas/[id]/orcamento) — o WhatsApp Web
 * não aceita anexo por link, então o arquivo é baixado e a conversa é aberta
 * com a mensagem pronta para o admin anexar.
 */
export function GerarOrcamento({
  festaId,
  telefone,
  contratante,
}: {
  festaId: string;
  telefone: string | null;
  contratante: string | null;
}) {
  const [gerando, setGerando] = useState(false);
  const [gerado, setGerado] = useState(false);

  async function baixar() {
    setGerando(true);
    try {
      const res = await fetch(`/api/festas/${festaId}/orcamento`);
      if (!res.ok) {
        toast.error("Não foi possível gerar o orçamento.");
        return;
      }
      const blob = await res.blob();
      const nome =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "orcamento.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setGerado(true);
      toast.success("Orçamento gerado! O PDF foi baixado.");
    } catch {
      toast.error("Não foi possível gerar o orçamento.");
    } finally {
      setGerando(false);
    }
  }

  function abrirWhatsApp() {
    const digits = (telefone ?? "").replace(/\D/g, "");
    const numero = digits.length > 0
      ? digits.startsWith("55") ? digits : `55${digits}`
      : "";
    const saudacao = contratante ? `Olá, ${contratante}!` : "Olá!";
    const msg = encodeURIComponent(
      `${saudacao} Segue o orçamento da sua festa com a Só Alegria — Recreação e Discoteca. Qualquer dúvida é só chamar!`,
    );
    window.open(
      numero ? `https://wa.me/${numero}?text=${msg}` : `https://wa.me/?text=${msg}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={baixar}
          disabled={gerando}
          className="bg-laranja font-semibold text-white hover:bg-laranja-escuro"
        >
          {gerando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          {gerando ? "Gerando…" : "Gerar orçamento (PDF)"}
        </Button>
        <Button onClick={abrirWhatsApp} variant="outline" className="font-semibold">
          <MessageCircle className="size-4" /> Enviar no WhatsApp
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {gerado
          ? "PDF baixado. Abra o WhatsApp e anexe o arquivo na conversa."
          : "Gere o PDF e depois anexe na conversa do WhatsApp com o cliente."}
      </p>
    </div>
  );
}
