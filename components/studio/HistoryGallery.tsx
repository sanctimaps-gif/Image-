"use client";

import { Copy, Download, ImageOff, Layers, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { GeneratedImageView } from "@/components/studio/GeneratedImageView";
import { formatDate } from "@/components/studio/GenerationDetails";
import { Button } from "@/components/ui/Button";
import { downloadUrl } from "@/lib/api-client";
import type { HistoryStatus } from "@/hooks/useHistory";
import type { Generation } from "@/types/generation";

interface HistoryGalleryProps {
  items: Generation[];
  status: HistoryStatus;
  error: string | null;
  activeId: string | null;
  onReload: () => void;
  onSelect: (generation: Generation) => void;
  onCopyPrompt: (generation: Generation) => void;
  onEdit: (generation: Generation) => void;
  onDelete: (generation: Generation) => void;
}

export function HistoryGallery({
  items,
  status,
  error,
  activeId,
  onReload,
  onSelect,
  onCopyPrompt,
  onEdit,
  onDelete,
}: HistoryGalleryProps) {
  return (
    <section id="historique" aria-labelledby="history-title" className="scroll-mt-24">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 id="history-title" className="text-xl font-semibold tracking-tight">
            Vos créations
          </h2>
          <p className="text-sm text-muted">
            Conservées sur ce serveur et associées à ce navigateur.
          </p>
        </div>
        {status === "ready" && items.length > 0 && (
          <span className="text-sm text-subtle">
            {items.length} création{items.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Chargement de l'historique">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="shimmer animate-shimmer aspect-square rounded-2xl" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-5 text-sm">
          <p className="text-muted">{error}</p>
          <Button size="sm" onClick={onReload}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réessayer
          </Button>
        </div>
      )}

      {status === "ready" && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border-strong px-6 py-12 text-center">
          <ImageOff className="h-6 w-6 text-subtle" aria-hidden />
          <p className="font-medium">Aucune création pour le moment</p>
          <p className="max-w-sm text-sm text-muted">Vos images générées apparaîtront ici, avec leur prompt et leurs paramètres.</p>
        </div>
      )}

      {status === "ready" && items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((generation) => {
            const cover = generation.images[0];
            if (!cover) return null;
            const isActive = generation.id === activeId;
            return (
              <li
                key={generation.id}
                className={
                  "group relative overflow-hidden rounded-2xl border bg-elevated shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 " +
                  (isActive ? "border-accent" : "border-border")
                }
              >
                <button
                  type="button"
                  onClick={() => onSelect(generation)}
                  className="block w-full text-left"
                  aria-label={`Afficher : ${generation.prompt}`}
                >
                  <div className="relative aspect-square">
                    <GeneratedImageView
                      image={cover}
                      alt=""
                      fit="cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      fillParent
                      className="absolute inset-0 h-full w-full"
                      transparent={generation.settings.background === "transparent"}
                    />
                    {generation.images.length > 1 && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                        <Layers className="h-3 w-3" aria-hidden />
                        {generation.images.length}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-[13px] leading-snug text-fg">{generation.prompt}</p>
                    <p className="mt-1 text-[11px] text-subtle">{formatDate(generation.createdAt)}</p>
                  </div>
                </button>
                <div className="flex items-center justify-end gap-0.5 border-t border-border px-1.5 py-1 sm:absolute sm:top-2 sm:right-2 sm:rounded-full sm:border-0 sm:bg-black/55 sm:px-1 sm:opacity-0 sm:backdrop-blur sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <HistoryAction label="Copier le prompt" onClick={() => onCopyPrompt(generation)}>
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </HistoryAction>
                  <HistoryAction label="Réutiliser ce prompt" onClick={() => onEdit(generation)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </HistoryAction>
                  <a
                    href={downloadUrl(cover.url)}
                    download
                    aria-label="Télécharger"
                    title="Télécharger"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/15 hover:text-fg sm:text-white sm:hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  <HistoryAction label="Supprimer" onClick={() => onDelete(generation)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </HistoryAction>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function HistoryAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/15 hover:text-fg sm:text-white sm:hover:text-white"
    >
      {children}
    </button>
  );
}
