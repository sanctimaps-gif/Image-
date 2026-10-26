import type { AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Lien présenté comme un bouton secondaire (téléchargements, liens externes). */
export function ButtonLink({ className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-elevated px-3 text-[13px] font-medium text-fg transition-colors hover:border-border-strong hover:bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
