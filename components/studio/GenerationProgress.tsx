"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ModelFormat } from "@/types/generation";

const STEPS = [
  "Analyse de votre description…",
  "Composition de la scène…",
  "Rendu des détails…",
  "Finalisation de l'image…",
];

interface GenerationProgressProps {
  startedAt: number;
  prompt: string;
  format: ModelFormat | null;
  count: number;
  onCancel: () => void;
}

/** État de chargement : squelette au ratio demandé, temps écoulé, possibilité d'annuler. */
export function GenerationProgress({ startedAt, prompt, format, count, onCancel }: GenerationProgressProps) {
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(elapsed / 12))];
  const ratio = format ? `${format.width} / ${format.height}` : "1 / 1";
  const tiles = Math.min(count, 4);

  return (
    <section aria-live="polite" aria-busy="true" className="animate-fade-in rounded-3xl border border-border bg-elevated p-4 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkles className="animate-pulse-soft h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">{step}</p>
            <p className="text-xs text-muted">
              {elapsed} s écoulées · une image haute qualité peut prendre jusqu&apos;à deux minutes
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Annuler
        </Button>
      </div>
      <div className={tiles > 1 ? "grid grid-cols-2 gap-3" : "flex justify-center"}>
        {Array.from({ length: tiles }, (_, i) => (
          <div
            key={i}
            className="shimmer animate-shimmer w-full max-w-xl rounded-2xl"
            style={{ aspectRatio: ratio, maxHeight: tiles > 1 ? undefined : "60vh" }}
          />
        ))}
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-muted">« {prompt} »</p>
    </section>
  );
}
