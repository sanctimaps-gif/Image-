import { RotateCcw, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorBannerProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  tone?: "error" | "info";
}

export function ErrorBanner({ title, message, onRetry, onDismiss, tone = "error" }: ErrorBannerProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "animate-fade-in flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center"
          : "animate-fade-in flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
      }
    >
      <TriangleAlert aria-hidden className={tone === "error" ? "h-5 w-5 shrink-0 text-danger" : "h-5 w-5 shrink-0 text-muted"} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-sm text-muted">{message}</p>
      </div>
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réessayer
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Fermer le message">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
