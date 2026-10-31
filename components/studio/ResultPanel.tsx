"use client";

import { Copy, Download, Maximize2, Pencil, RotateCcw, WandSparkles } from "lucide-react";
import { useState } from "react";
import { GeneratedImageView } from "@/components/studio/GeneratedImageView";
import { GenerationDetails } from "@/components/studio/GenerationDetails";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useBackend } from "@/components/BackendProvider";
import { cn } from "@/lib/cn";
import type { GeneratedImage, Generation, ModelInfo } from "@/types/generation";

interface ResultPanelProps {
  generation: Generation;
  models: ModelInfo[];
  canCreateVariant: boolean;
  busy: boolean;
  onCopyPrompt: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onVariant: (image: GeneratedImage) => void;
  onOpen: (index: number) => void;
}

export function ResultPanel({
  generation,
  models,
  canCreateVariant,
  busy,
  onCopyPrompt,
  onRetry,
  onEdit,
  onVariant,
  onOpen,
}: ResultPanelProps) {
  const [selected, setSelected] = useState(0);
  const backend = useBackend();
  const index = Math.min(selected, generation.images.length - 1);
  const image = generation.images[index]!;
  const transparent = generation.settings.background === "transparent";

  return (
    <section
      aria-labelledby="result-title"
      className="animate-fade-in overflow-hidden rounded-3xl border border-border bg-elevated shadow-card"
    >
      <h2 id="result-title" className="sr-only">
        Résultat de la génération
      </h2>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3 bg-surface/50 p-3 sm:p-4">
          <button
            type="button"
            onClick={() => onOpen(index)}
            className="group relative mx-auto block w-full max-w-3xl cursor-zoom-in overflow-hidden rounded-2xl"
            aria-label="Agrandir l'image"
          >
            <GeneratedImageView
              image={image}
              alt={generation.prompt}
              priority
              transparent={transparent}
              className="max-h-[70vh] w-full rounded-2xl"
            />
            <span className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Maximize2 className="h-4 w-4" aria-hidden />
            </span>
          </button>

          {generation.images.length > 1 && (
            <div className="flex justify-center gap-2" role="group" aria-label="Images générées">
              {generation.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-label={`Afficher l'image ${i + 1}`}
                  aria-pressed={i === index}
                  className={cn(
                    "h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors",
                    i === index ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <GeneratedImageView image={img} alt="" fit="cover" sizes="64px" fillParent className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 border-t border-border p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-subtle">Prompt</p>
            <p className="max-h-40 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-fg">{generation.prompt}</p>
          </div>

          {generation.revisedPrompt && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-subtle">Demande comprise par l&apos;IA</p>
              <p lang="en" className="max-h-40 overflow-y-auto text-sm leading-relaxed text-muted">
                {generation.revisedPrompt}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ButtonLink href={backend.download(image).href} download={backend.download(image).filename}>
              <Download className="h-4 w-4" aria-hidden />
              Télécharger
            </ButtonLink>
            <Button size="sm" onClick={onCopyPrompt}>
              <Copy className="h-4 w-4" aria-hidden />
              Copier le prompt
            </Button>
            <Button size="sm" onClick={onRetry} disabled={busy}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Réessayer
            </Button>
            <Button size="sm" onClick={onEdit} disabled={busy}>
              <Pencil className="h-4 w-4" aria-hidden />
              Modifier
            </Button>
            {canCreateVariant && (
              <Button size="sm" onClick={() => onVariant(image)} disabled={busy}>
                <WandSparkles className="h-4 w-4" aria-hidden />
                Créer une variante
              </Button>
            )}
          </div>

          <GenerationDetails generation={generation} models={models} />
        </div>
      </div>
    </section>
  );
}
