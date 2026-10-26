import type { AspectId, Background, OutputFormat, Quality, StyleId } from "@/types/generation";

/** Libellés et descripteurs de style. Partagé client/serveur (aucun secret). */
export interface StyleDefinition {
  id: StyleId;
  label: string;
  /** Instructions ajoutées au prompt côté serveur. */
  promptSuffix: string;
}

export const STYLES: readonly StyleDefinition[] = [
  { id: "none", label: "Aucun style", promptSuffix: "" },
  {
    id: "photorealistic",
    label: "Photorealistic",
    promptSuffix:
      "Photorealistic photograph, natural lighting, true-to-life textures and materials, sharp focus, high dynamic range.",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    promptSuffix:
      "Cinematic film still, dramatic lighting, anamorphic lens look, shallow depth of field, rich color grading.",
  },
  {
    id: "anime",
    label: "Anime",
    promptSuffix: "Anime style illustration, clean line art, expressive characters, vibrant cel shading.",
  },
  {
    id: "illustration",
    label: "Illustration",
    promptSuffix: "Editorial illustration, hand-drawn feel, cohesive color palette, clear composition.",
  },
  {
    id: "digital-art",
    label: "Digital art",
    promptSuffix: "Highly detailed digital painting, concept art quality, painterly brushwork, luminous colors.",
  },
  {
    id: "3d-render",
    label: "3D render",
    promptSuffix: "High-end 3D render, physically based materials, global illumination, soft shadows, studio quality.",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    promptSuffix: "Epic fantasy artwork, magical atmosphere, ethereal light, intricate details, mythical mood.",
  },
  {
    id: "minimalist",
    label: "Minimalist",
    promptSuffix: "Minimalist composition, generous negative space, limited color palette, simple clean shapes.",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    promptSuffix: "Watercolor painting on textured paper, soft washes, organic pigment bleeds, delicate edges.",
  },
  {
    id: "pixel-art",
    label: "Pixel art",
    promptSuffix: "Pixel art, crisp pixels, limited retro color palette, 16-bit video game aesthetic.",
  },
  {
    id: "logo-design",
    label: "Logo design",
    promptSuffix:
      "Professional logo design, simple memorable vector mark, flat colors, centered on a plain background, no mockup.",
  },
];

export const ASPECT_LABELS: Record<AspectId, { label: string; ratio: string }> = {
  square: { label: "Carré", ratio: "1:1" },
  portrait: { label: "Portrait", ratio: "2:3" },
  landscape: { label: "Paysage", ratio: "3:2" },
  widescreen: { label: "Grand écran", ratio: "16:9" },
};

export const QUALITY_LABELS: Record<Quality, string> = {
  auto: "Automatique",
  low: "Brouillon (rapide)",
  medium: "Standard",
  high: "Haute qualité",
};

export const BACKGROUND_LABELS: Record<Background, string> = {
  auto: "Automatique",
  opaque: "Opaque",
  transparent: "Transparent",
};

export const OUTPUT_FORMAT_LABELS: Record<OutputFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
};

export function getStyle(id: StyleId): StyleDefinition {
  return STYLES.find((s) => s.id === id) ?? STYLES[0]!;
}

export const MAX_PROMPT_LENGTH = 4000;
