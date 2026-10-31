"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { GeneratedImage } from "@/types/generation";

interface GeneratedImageViewProps {
  image: GeneratedImage;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  transparent?: boolean;
  fit?: "cover" | "contain";
  /** Remplit le conteneur parent au lieu d'imposer le ratio de l'image. */
  fillParent?: boolean;
}

/** Image générée avec états de chargement et d'indisponibilité (fichier supprimé, réseau…). */
export function GeneratedImageView({
  image,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 768px",
  priority = false,
  transparent = false,
  fit = "contain",
  fillParent = false,
}: GeneratedImageViewProps) {
  const [loadState, setState] = useState<"loading" | "loaded" | "error">("loading");
  const state = image.url ? loadState : "error";

  return (
    <div
      className={cn("relative overflow-hidden", transparent ? "checkerboard" : "bg-surface", className)}
      style={fillParent ? undefined : { aspectRatio: `${image.width} / ${image.height}` }}
    >
      {state === "loading" && <div className="shimmer animate-shimmer absolute inset-0" aria-hidden />}
      {state === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted">
          <ImageOff className="h-6 w-6" aria-hidden />
          Image indisponible
        </div>
      ) : (
        <Image
          src={image.url}
          alt={alt}
          fill
          unoptimized
          priority={priority}
          sizes={sizes}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={cn(
            "transition-opacity duration-500",
            fit === "cover" ? "object-cover" : "object-contain",
            state === "loaded" ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
