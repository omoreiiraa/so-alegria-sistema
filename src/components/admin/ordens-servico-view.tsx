"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Upload,
  Send,
  Check,
  X,
  Paperclip,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils/date";
import {
  SERVICE_ORDER_STATUS_LABEL,
  CONFIRMATION_METHOD_LABEL,
} from "@/types/domain";
import type { ServiceOrderStatus, ConfirmationMethod } from "@/types/domain";
import {
  gerarOrdemServico,
  marcarOSEnviada,
  registrarRespostaOS,
  anexarArquivoOS,
  urlArquivoOS,
  removerArquivoOS,
  excluirOrdemServico,
} from "@/actions/ordens-servico";

export type OrdemServicoCard = {
  id: string;
  numero: number;
  ano: number;
  dataEmissao: string;
  status: ServiceOrderStatus;
  enviadaEm: string | null;
  respondidoEm: string | null;
  meioConfirmacao: ConfirmationMethod | null;
  motivoRecusa: string | null;
  temArquivo: boolean;
  colaborador: string;
  festaId: string | null;
  festaData: string | null;
  festaHoraInicio: string | null;
  festaHoraFim: string | null;
  contratante: string | null;
  local: string;
};

export type EscalaSemOS = {
  assignmentId: string;
  colaborador: string;
  festaId: string;
  festaData: string;
  contratante: string | null;
  local: string;
};

const NUMERO = (n: number, ano: number) => `${String(n).padStart(4, "0")}/${ano}`;

function statusBadge(status: ServiceOrderStatus) {
  const label = SERVICE_ORDER_STATUS_LABEL[status];
  if (status === "aceita")
    return <Badge className="bg-verde/15 text-verde-escuro">{label}</Badge>;
  if (status === "enviada")
    return <Badge className="bg-laranja/15 text-laranja-escuro">{label}</Badge>;
  if (status === "recusada")
    return <Badge className="bg-vermelho/10 text-vermelho">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

export function OrdensServicoView({
  ordens,
  semOS,
}: {
  ordens: OrdemServicoCard[];
  semOS: EscalaSemOS[];
}) {
  return (
    <div className="space-y-8">
      {semOS.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-laranja-escuro">
            Escalações sem OS ({semOS.length})
          </h2>
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {semOS.map((e) => (
              <SemOSCard key={e.assignmentId} escala={e} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Ordens emitidas ({ordens.length})
        </h2>
        {ordens.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-6" />}
            title="Nenhuma Ordem de Serviço emitida"
            description="Gere a OS a partir de uma escalação para começar."
          />
        ) : (
          <div className="grid gap-3 2xl:grid-cols-2">
            {ordens.map((os) => (
              <OSCard key={os.id} os={os} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SemOSCard({ escala }: { escala: EscalaSemOS }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function gerar() {
    startTransition(async () => {
      const res = await gerarOrdemServico(escala.assignmentId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Ordem de Serviço gerada!");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{escala.colaborador}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {formatDate(escala.festaData)}
            {escala.contratante ? ` · ${escala.contratante}` : ""}
            {escala.local ? ` · ${escala.local}` : ""}
          </p>
        </div>
        <Button
          size="sm"
          onClick={gerar}
          disabled={pending}
          className="shrink-0 bg-verde font-semibold text-white hover:bg-verde-escuro"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Gerar OS
        </Button>
      </CardContent>
    </Card>
  );
}

function OSCard({ os }: { os: OrdemServicoCard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [respostaAberta, setRespostaAberta] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  function enviar() {
    startTransition(async () => {
      const res = await marcarOSEnviada(os.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("OS marcada como enviada.");
        router.refresh();
      }
    });
  }

  function anexar(file: File) {
    const fd = new FormData();
    fd.append("arquivo", file);
    startTransition(async () => {
      const res = await anexarArquivoOS(os.id, fd);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Documento anexado.");
        router.refresh();
      }
    });
  }

  function abrirAnexo() {
    startTransition(async () => {
      const res = await urlArquivoOS(os.id);
      if (res?.error || !res?.url) {
        toast.error(res?.error ?? "Não foi possível abrir o arquivo.");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  function removerAnexo() {
    startTransition(async () => {
      const res = await removerArquivoOS(os.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Anexo removido.");
        router.refresh();
      }
    });
  }

  function excluir() {
    startTransition(async () => {
      const res = await excluirOrdemServico(os.id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("OS excluída.");
        setConfirmarExclusao(false);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-extrabold">
                OS {NUMERO(os.numero, os.ano)}
              </h3>
              {statusBadge(os.status)}
            </div>
            <p className="mt-0.5 text-sm font-medium">{os.colaborador}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {os.festaData ? formatDate(os.festaData) : "Sem festa"}
              {os.festaHoraInicio && os.festaHoraFim
                ? ` · ${formatTime(os.festaHoraInicio)}–${formatTime(os.festaHoraFim)}`
                : ""}
              {os.contratante ? ` · ${os.contratante}` : ""}
              {os.local ? ` · ${os.local}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Emitida em {formatDate(os.dataEmissao)}
              {os.enviadaEm ? ` · enviada em ${formatDateTime(os.enviadaEm)}` : ""}
            </p>
            {os.respondidoEm && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  os.status === "aceita" ? "text-verde-escuro" : "text-vermelho",
                )}
              >
                {os.status === "aceita" ? "Aceita" : "Recusada"} em{" "}
                {formatDateTime(os.respondidoEm)}
                {os.meioConfirmacao
                  ? ` · ${CONFIRMATION_METHOD_LABEL[os.meioConfirmacao]}`
                  : ""}
                {os.motivoRecusa ? ` — ${os.motivoRecusa}` : ""}
              </p>
            )}
          </div>
          {os.festaId && (
            <Button
              render={<Link href={`/admin/festas/${os.festaId}`} />}
              variant="ghost"
              size="sm"
            >
              Ver festa
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            render={<a href={`/api/ordens-servico/${os.id}/docx`} />}
            size="sm"
            variant="outline"
            className="font-semibold"
          >
            <Download className="size-4" /> Baixar modelo
          </Button>

          <input
            ref={inputArquivo}
            type="file"
            accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) anexar(f);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="font-semibold"
            disabled={pending}
            onClick={() => inputArquivo.current?.click()}
          >
            <Upload className="size-4" />
            {os.temArquivo ? "Substituir anexo" : "Anexar preenchido"}
          </Button>

          {os.temArquivo && (
            <>
              <Button size="sm" variant="ghost" disabled={pending} onClick={abrirAnexo}>
                <Paperclip className="size-4" /> Ver anexo
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={removerAnexo}
                className="text-muted-foreground hover:text-vermelho"
              >
                <X className="size-4" />
              </Button>
            </>
          )}

          {os.status === "rascunho" && (
            <Button
              size="sm"
              disabled={pending}
              onClick={enviar}
              className="bg-laranja font-semibold text-white hover:bg-laranja-escuro"
            >
              <Send className="size-4" /> Marcar como enviada
            </Button>
          )}

          {os.status !== "rascunho" && (
            <Button
              size="sm"
              variant="outline"
              className="font-semibold"
              onClick={() => setRespostaAberta(true)}
            >
              <Check className="size-4" />
              {os.respondidoEm ? "Editar resposta" : "Registrar resposta"}
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirmarExclusao(true)}
            className="ml-auto text-muted-foreground hover:text-vermelho"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>

      <RespostaDialog
        osId={os.id}
        open={respostaAberta}
        onOpenChange={setRespostaAberta}
      />

      <Dialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir OS {NUMERO(os.numero, os.ano)}?</DialogTitle>
            <DialogDescription>
              O número não será reaproveitado e o anexo, se houver, também é
              apagado. Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmarExclusao(false)}
              disabled={pending}
            >
              Voltar
            </Button>
            <Button
              onClick={excluir}
              disabled={pending}
              className="bg-vermelho font-semibold text-white hover:bg-vermelho/90"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RespostaDialog({
  osId,
  open,
  onOpenChange,
}: {
  osId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aceita, setAceita] = useState(true);
  const [meio, setMeio] = useState<ConfirmationMethod>("whatsapp");
  const [quando, setQuando] = useState(() => {
    // datetime-local espera hora local, sem fuso.
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [motivo, setMotivo] = useState("");

  function salvar() {
    startTransition(async () => {
      const res = await registrarRespostaOS(osId, {
        aceita,
        meio_confirmacao: meio,
        respondido_em: quando,
        motivo_recusa: motivo,
      });
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Resposta registrada.");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar resposta do colaborador</DialogTitle>
          <DialogDescription>
            O aceite acontece fora do sistema. Registre aqui o que o colaborador
            respondeu, como o modelo da contratante pede.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAceita(true)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                aceita
                  ? "border-verde bg-verde/10 text-verde-escuro"
                  : "border-border hover:bg-muted",
              )}
            >
              <Check className="mr-1 inline size-4" /> Aceitou
            </button>
            <button
              type="button"
              onClick={() => setAceita(false)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                !aceita
                  ? "border-vermelho bg-vermelho/10 text-vermelho"
                  : "border-border hover:bg-muted",
              )}
            >
              <X className="mr-1 inline size-4" /> Recusou
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quando">Resposta enviada em</Label>
            <Input
              id="quando"
              type="datetime-local"
              value={quando}
              onChange={(e) => setQuando(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Meio de confirmação</Label>
            <div className="flex flex-wrap gap-2">
              {(
                Object.keys(CONFIRMATION_METHOD_LABEL) as ConfirmationMethod[]
              ).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMeio(m)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    meio === m
                      ? "border-verde bg-verde/10 text-verde-escuro"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {CONFIRMATION_METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          {!aceita && (
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo da recusa (opcional)</Label>
              <Input
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: conflito de agenda"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={pending}
            className="bg-verde font-semibold text-white hover:bg-verde-escuro"
          >
            {pending ? "Salvando…" : "Salvar resposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
