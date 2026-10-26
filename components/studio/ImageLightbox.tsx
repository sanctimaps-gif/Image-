"use client";

import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { GeneratedImageView } from "@/components/studio/GeneratedImageView";
import { downloadUrl } from "@/lib/api-client";
import type { Generation } from "@/types/generation";

interface ImageLightboxProps {
  generation: Generation;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Vue agrandie basée sur <dialog> natif : piège du focus, Échap et retour du focus gérés par le navigateur. */
export function ImageLightbox({ generation, index, onIndexChange, onClose }: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const total = generation.images.length;
  const image = generation.images[Math.min(index, total - 1)]!;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  function step(delta: number) {
    if (total > 1) onIndexChange((index + delta + total) % total);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  }

  const iconButton =
    "flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      aria-label="Image agrandie"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-white backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col" onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}>
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <p className="min-w-0 truncate text-sm text-white/80">
            {total > 1 && <span className="mr-2 font-mono">{index + 1}/{total}</span>}
            {generation.prompt}
          </p>
          <div className="flex shrink-0 gap-2">
            <a href={downloadUrl(image.url)} download className={iconButton} aria-label="Télécharger l'image">
              <Download className="h-5 w-5" aria-hidden />
            </a>
            <button type="button" className={iconButton} onClick={() => dialogRef.current?.close()} aria-label="Fermer" autoFocus>
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6 sm:px-16"
          onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
        >
          <div
            className="h-full max-h-full"
            style={{ aspectRatio: `${image.width} / ${image.height}`, maxWidth: "100%" }}
          >
            <GeneratedImageView
              key={image.id}
              image={image}
              alt={generation.prompt}
              sizes="100vw"
              transparent={generation.settings.background === "transparent"}
              className="max-h-full w-full rounded-xl"
            />
          </div>
          {total > 1 && (
            <>
              <button type="button" className={`${iconButton} absolute left-3 sm:left-4`} onClick={() => step(-1)} aria-label="Image précédente">
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button type="button" className={`${iconButton} absolute right-3 sm:right-4`} onClick={() => step(1)} aria-label="Image suivante">
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
