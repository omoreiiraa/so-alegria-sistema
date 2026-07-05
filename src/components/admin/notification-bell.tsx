"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, UserPlus, CalendarX, Ban, CheckCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/date";
import { marcarNotificacaoLida, marcarTodasLidas } from "@/actions/notificacoes";

export type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  party_id: string | null;
  lida: boolean;
  created_at: string;
};

function iconFor(tipo: string) {
  if (tipo === "novo_cadastro") return <UserPlus className="size-4 text-laranja" />;
  if (tipo === "recusa") return <CalendarX className="size-4 text-vermelho" />;
  if (tipo === "cancelamento") return <Ban className="size-4 text-vermelho" />;
  return <Bell className="size-4 text-muted-foreground" />;
}

export function NotificationBell({
  notifications,
  unread,
}: {
  notifications: Notificacao[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function abrir(n: Notificacao) {
    startTransition(async () => {
      if (!n.lida) await marcarNotificacaoLida(n.id);
      const destino =
        n.tipo === "novo_cadastro"
          ? "/admin/colaboradores"
          : n.party_id
            ? `/admin/festas/${n.party_id}`
            : null;
      setOpen(false);
      if (destino) router.push(destino);
      else router.refresh();
    });
  }

  function todas() {
    startTransition(async () => {
      await marcarTodasLidas();
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-vermelho px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="font-display text-sm font-bold">Notificações</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={todas}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" /> Marcar lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma notificação.
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => abrir(n)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted",
                  !n.lida && "bg-verde/5",
                )}
              >
                <span className="mt-0.5 shrink-0">{iconFor(n.tipo)}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">{n.titulo}</span>
                    {!n.lida && <span className="size-1.5 shrink-0 rounded-full bg-verde" />}
                  </span>
                  {n.corpo && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{n.corpo}</span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground/70">
                    {formatDateTime(n.created_at)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
