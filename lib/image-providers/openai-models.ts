import type { ModelFormat, ModelInfo, Quality } from "@/types/generation";

/**
 * Capacités des modèles GPT Image, d'après la référence officielle de l'API Images
 * (paramètres `size`, `quality`, `background`, `output_format`, `n` de /v1/images/generations
 * et /v1/images/edits — SDK openai 7.x) :
 *  - tailles standard 1024x1024, 1536x1024, 1024x1536 pour tous les modèles GPT Image ;
 *  - tailles arbitraires WIDTHxHEIGHT (multiples de 16, ratio entre 1:3 et 3:1) pour gpt-image-2,
 *    non expérimentales jusqu'à 2560x1440 (≈ 3,69 Mpx) : les tailles « HD » ci-dessous restent
 *    dans cette surface (1920², 1536×2304, 2560×1440…) ;
 *  - fond transparent pour gpt-image-1/1.5/1-mini ; seulement « en aperçu » pour gpt-image-2,
 *    donc volontairement non proposé ici ;
 *  - n entre 1 et 10 ; qualité low | medium | high | auto.
 */

const fmt = (aspect: ModelFormat["aspect"], width: number, height: number, hd?: [number, number]): ModelFormat => ({
  aspect,
  size: `${width}x${height}`,
  width,
  height,
  ...(hd && { hd: { size: `${hd[0]}x${hd[1]}`, width: hd[0], height: hd[1] } }),
});

const STANDARD_FORMATS: ModelFormat[] = [
  fmt("square", 1024, 1024),
  fmt("portrait", 1024, 1536),
  fmt("landscape", 1536, 1024),
];

const QUALITIES: Quality[] = ["auto", "low", "medium", "high"];
const API_MAX_IMAGES = 10;

export interface OpenAIModelSpec extends ModelInfo {
  /** Valeur `input_fidelity` à envoyer pour les variantes, ou null pour l'omettre. */
  editInputFidelity: "high" | "low" | null;
}

export const OPENAI_IMAGE_MODELS: Record<string, OpenAIModelSpec> = {
  "gpt-image-2": {
    id: "gpt-image-2",
    label: "GPT Image 2",
    description: "Modèle le plus récent : texte lisible sur l'image, formats 16:9 et 9:16, haute définition.",
    // Toutes les dimensions sont des multiples de 16 ; 1536x864 / 864x1536 = 16:9 et 9:16 exacts.
    formats: [
      fmt("square", 1024, 1024, [1920, 1920]),
      fmt("portrait", 1024, 1536, [1536, 2304]),
      fmt("landscape", 1536, 1024, [2304, 1536]),
      fmt("widescreen", 1536, 864, [2560, 1440]),
      fmt("story", 864, 1536, [1440, 2560]),
    ],
    qualities: QUALITIES,
    outputFormats: ["png", "jpeg", "webp"],
    supportsTransparency: false,
    supportsVariations: true,
    maxImages: API_MAX_IMAGES,
    // La documentation demande d'omettre input_fidelity pour gpt-image-2.
    editInputFidelity: null,
  },
  "gpt-image-1.5": {
    id: "gpt-image-1.5",
    label: "GPT Image 1.5",
    description: "Très bonne qualité, fond transparent disponible.",
    formats: STANDARD_FORMATS,
    qualities: QUALITIES,
    outputFormats: ["png", "jpeg", "webp"],
    supportsTransparency: true,
    supportsVariations: true,
    maxImages: API_MAX_IMAGES,
    editInputFidelity: "high",
  },
  "gpt-image-1-mini": {
    id: "gpt-image-1-mini",
    label: "GPT Image 1 Mini",
    description: "Plus rapide et économique.",
    formats: STANDARD_FORMATS,
    qualities: QUALITIES,
    outputFormats: ["png", "jpeg", "webp"],
    supportsTransparency: true,
    supportsVariations: true,
    maxImages: API_MAX_IMAGES,
    editInputFidelity: "low",
  },
  "gpt-image-1": {
    id: "gpt-image-1",
    label: "GPT Image 1",
    description: "Modèle de première génération.",
    formats: STANDARD_FORMATS,
    qualities: QUALITIES,
    outputFormats: ["png", "jpeg", "webp"],
    supportsTransparency: true,
    supportsVariations: true,
    maxImages: API_MAX_IMAGES,
    editInputFidelity: "high",
  },
};

/** Sélectionne les modèles activés (dans l'ordre demandé), en ignorant les identifiants inconnus. */
export function resolveEnabledModels(list: string, maxImages: number): OpenAIModelSpec[] {
  const ids = [...new Set(list.split(",").map((s) => s.trim()).filter(Boolean))];
  const models: OpenAIModelSpec[] = [];
  for (const id of ids) {
    const spec = OPENAI_IMAGE_MODELS[id];
    if (!spec) {
      console.warn(`[visionai] Modèle OpenAI inconnu ignoré : "${id}".`);
      continue;
    }
    models.push({ ...spec, maxImages: Math.min(spec.maxImages, maxImages) });
  }
  return models;
}
