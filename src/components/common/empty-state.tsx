import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Estado vazio padrão (docs/07: toda tela com dados tem vazio/loading/erro). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
