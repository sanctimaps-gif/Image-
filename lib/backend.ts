import { ApiClientError, deleteGeneration, downloadUrl, fetchHistory, generateImages } from "@/lib/api-client";
import type { GenerateRequestInput } from "@/lib/validation";
import type { GeneratedImage, Generation, GenerationProgressInfo } from "@/types/generation";

/**
 * Ce dont l'interface a besoin pour générer et gérer l'historique.
 * Deux implémentations : le serveur Next.js (routes /api) et la version statique
 * qui tourne entièrement dans le navigateur (GitHub Pages).
 */
export interface StudioBackend {
  generate(
    payload: GenerateRequestInput,
    signal?: AbortSignal,
    onProgress?: (progress: GenerationProgressInfo) => void,
  ): Promise<Generation>;
  list(signal?: AbortSignal): Promise<Generation[]>;
  remove(id: string): Promise<void>;
  /** Lien de téléchargement d'une image et nom de fichier proposé. */
  download(image: GeneratedImage): { href: string; filename: string };
}

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function downloadFilename(image: GeneratedImage): string {
  return `visionai-${image.id.slice(0, 8)}.${EXTENSIONS[image.mimeType] ?? "png"}`;
}

export const serverBackend: StudioBackend = {
  generate: (payload, signal) => generateImages(payload, signal),
  list: fetchHistory,
  remove: deleteGeneration,
  download: (image) => ({ href: downloadUrl(image.url), filename: downloadFilename(image) }),
};

export { ApiClientError };
