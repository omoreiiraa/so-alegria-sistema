"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Download, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fecharSemana, marcarPago, marcarTodosPagos } from "@/actions/pagamentos";
import { formatBRL } from "@/lib/utils/money";
import { formatDate } from "@/lib/utils/date";

export type PagamentoRow = {
  paymentId: string | null;
  userId: string;
  nome: string;
  nomeTio: string | null;
  chavePix: string | null;
  qtd: number;
  valor: number;
  status: "aberto" | "pago" | "previa";
  pagoEm: string | null;
};

export function PagamentosAdmin({
  semanaInicio,
  semanaFim,
  prevSemana,
  nextSemana,
  fechada,
  rows,
}: {
  semanaInicio: string;
  semanaFim: string;
  prevSemana: string;
  nextSemana: string;
  fechada: boolean;
  rows: PagamentoRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const total = rows.reduce((s, r) => s + r.valor, 0);
  const abertos = rows.filter((r) => r.status === "aberto" && r.paymentId);

  function fechar() {
    startTransition(async () => {
      const res = await fecharSemana(semanaInicio);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(fechada ? "Semana recalculada." : "Semana fechada!");
        router.refresh();
      }
    });
  }

  function pagar(id: string) {
    startTransition(async () => {
      const res = await marcarPago(id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Pagamento registrado.");
        router.refresh();
      }
    });
  }

  function pagarTodos() {
    startTransition(async () => {
      const res = await marcarTodosPagos(abertos.map((r) => r.paymentId!));
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Todos marcados como pagos.");
        router.refresh();
      }
    });
  }

  function copiarPix(pix: string | null) {
    if (!pix) return;
    navigator.clipboard.writeText(pix);
    toast.success("Chave PIX copiada.");
  }

  function exportarCsv() {
    const head = ["Colaborador", "Nome de tio", "Festas", "Valor", "Chave PIX", "Status"];
    const linhas = rows.map((r) =>
      [r.nome, r.nomeTio ?? "", r.qtd, r.valor.toFixed(2), r.chavePix ?? "", r.status]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [head.join(","), ...linhas].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagamentos-${semanaInicio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button render={<Link href={`/admin/pagamentos?semana=${prevSemana}`} />} variant="outline" size="icon" aria-label="Semana anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <div className="px-3 text-center">
            <p className="text-sm font-semibold">
              {formatDate(semanaInicio)} – {formatDate(semanaFim)}
            </p>
            <p className="text-xs text-muted-foreground">
              {fechada ? "Semana fechada" : "Prévia (não fechada)"}
            </p>
          </div>
          <Button render={<Link href={`/admin/pagamentos?semana=${nextSemana}`} />} variant="outline" size="icon" aria-label="Próxima semana">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportarCsv} disabled={rows.length === 0}>
            <Download className="size-4" /> CSV
          </Button>
          <Button onClick={fechar} disabled={pending} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
            <RefreshCw className="size-4" /> {fechada ? "Recalcular" : "Fechar semana"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Total da semana</p>
            <p className="font-display text-2xl font-extrabold text-verde-escuro tabular">
              {formatBRL(total)}
            </p>
          </div>
          {abertos.length > 0 && (
            <Button onClick={pagarTodos} disabled={pending} variant="outline" className="font-semibold">
              <Check className="size-4" /> Marcar todos pagos ({abertos.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhuma festa realizada e confirmada nesta semana.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-center">Festas</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Chave PIX</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell>
                    <span className="font-medium">{r.nome}</span>
                    {r.nomeTio && (
                      <span className="ml-1 text-xs text-muted-foreground">({r.nomeTio})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular">{r.qtd}</TableCell>
                  <TableCell className="text-right font-semibold tabular">
                    {formatBRL(r.valor)}
                  </TableCell>
                  <TableCell>
                    {r.chavePix ? (
                      <button
                        type="button"
                        onClick={() => copiarPix(r.chavePix)}
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <span className="max-w-[140px] truncate">{r.chavePix}</span>
                        <Copy className="size-3.5 shrink-0" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pago" ? (
                      <Badge className="bg-verde/15 text-verde-escuro">
                        Pago {r.pagoEm ? `· ${formatDate(r.pagoEm)}` : ""}
                      </Badge>
                    ) : r.status === "aberto" && r.paymentId ? (
                      <Button size="sm" onClick={() => pagar(r.paymentId!)} disabled={pending} className="bg-verde font-semibold text-white hover:bg-verde-escuro">
                        Marcar pago
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">feche a semana</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
