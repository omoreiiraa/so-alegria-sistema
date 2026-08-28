"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  FileSignature,
  Loader2,
  MessageCircle,
  Eye,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  anexarOrcamentoAssinado,
  removerOrcamentoAssinado,
  urlOrcamentoAssinado,
} from "@/actions/contratos";
import { toWhatsAppNumber } from "@/lib/utils/phone";

/**
 * Contrato do evento: o orçamento que o cliente preencheu e devolveu, com a
 * página de dados da empresa (depósito, PIX, cadastro e cláusula de
 * cancelamento) acrescentada no fim.
 */
export function ContratoFesta({
  festaId,
  temAnexo,
  telefone,
  contratante,
}: {
  festaId: string;
  temAnexo: boolean;
  telefone: string | null;
  contratante: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [gerando, setGerando] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);

  function enviar(file: File) {
    const formData = new FormData();
    formData.append("arquivo", file);
    startTransition(async () => {
      const res = await anexarOrcamentoAssinado(festaId, formData);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Orçamento anexado. O contrato já pode ser gerado.");
        router.refresh();
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function remover() {
    startTransition(async () => {
      const res = await removerOrcamentoAssinado(festaId);
      if (res.error) toast.error(res.error);
      else {
        setConfirmarRemocao(false);
        toast.success("Anexo removido.");
        router.refresh();
      }
    });
  }

  function verAnexo() {
    startTransition(async () => {
      const res = await urlOrcamentoAssinado(festaId);
      if ("error" in res) toast.error(res.error);
      else window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  async function baixarContrato() {
    setGerando(true);
    try {
      const res = await fetch(`/api/festas/${festaId}/contrato`);
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        toast.error(corpo?.error ?? "Não foi possível gerar o contrato.");
        return;
      }
      const blob = await res.blob();
      const nome =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "contrato.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Contrato gerado! O PDF foi baixado.");
    } catch {
      toast.error("Não foi possível gerar o contrato.");
    } finally {
      setGerando(false);
    }
  }

  function abrirWhatsApp() {
    const numero = toWhatsAppNumber(telefone);
    const saudacao = contratante ? `Olá, ${contratante}!` : "Olá!";
    const msg = encodeURIComponent(
      `${saudacao} Segue o contrato do seu evento com a Só Alegria. ` +
        "Na última página estão os dados para o depósito/PIX e o cadastro para preencher.",
    );
    window.open(
      numero ? `https://wa.me/${numero}?text=${msg}` : `https://wa.me/?text=${msg}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-sm">
        {temAnexo ? (
          <>
            <CheckCircle2 className="size-4 text-verde" />
            <span className="text-muted-foreground">
              Orçamento devolvido pelo cliente está anexado.
            </span>
          </>
        ) : (
          <>
            <Upload className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Nada devolvido pelo cliente ainda — o contrato usa o orçamento do
              sistema.
            </span>
          </>
        )}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) enviar(file);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {/* Gerar não depende do anexo: sem ele, o contrato começa pelo
            orçamento que o próprio sistema monta. */}
        <Button
          size="sm"
          disabled={gerando}
          onClick={baixarContrato}
          className="bg-laranja font-semibold text-white hover:bg-laranja-escuro"
        >
          {gerando ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FileSignature className="size-3.5" />
          )}
          {gerando ? "Gerando…" : "Gerar contrato (PDF)"}
        </Button>

        <Button size="sm" variant="outline" onClick={abrirWhatsApp}>
          <MessageCircle className="size-3.5" /> WhatsApp
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {temAnexo ? "Trocar anexo" : "Anexar devolvido"}
        </Button>

        {temAnexo && (
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={verAnexo}>
              <Eye className="size-3.5" /> Ver anexo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmarRemocao(true)}
              className="text-vermelho hover:text-vermelho"
            >
              <Trash2 className="size-3.5" /> Remover
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {temAnexo
          ? "O contrato sai com o orçamento devolvido pelo cliente e, no fim, a página com depósito, PIX, cadastro e cláusula de cancelamento."
          : "O contrato sai com o orçamento gerado pelo sistema e a página de dados da empresa. Quando o cliente devolver o orçamento preenchido, anexe aqui (PDF ou foto, até 10 MB) que ele entra no lugar."}
      </p>

      <Dialog open={confirmarRemocao} onOpenChange={setConfirmarRemocao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover o orçamento anexado?</DialogTitle>
            <DialogDescription>
              O arquivo devolvido pelo cliente é apagado e o contrato deixa de
              poder ser gerado até você anexar outro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmarRemocao(false)}
            >
              Voltar
            </Button>
            <Button
              onClick={remover}
              disabled={pending}
              className="bg-vermelho font-semibold text-white hover:bg-vermelho/90"
            >
              {pending ? "Removendo…" : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
