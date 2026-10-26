import type {
  AspectId,
  Background,
  GenerationSettings,
  ModelInfo,
  OutputFormat,
  Quality,
  StyleId,
} from "@/types/generation";

/** Réglages modifiables dans l'interface (le fournisseur est déduit du modèle). */
export interface ComposerSettings {
  model: string;
  style: StyleId;
  aspect: AspectId;
  quality: Quality;
  background: Background;
  outputFormat: OutputFormat;
  outputCompression: number;
  count: number;
}

export const DEFAULT_SETTINGS: Omit<ComposerSettings, "model"> = {
  style: "none",
  aspect: "square",
  quality: "auto",
  background: "auto",
  outputFormat: "png",
  outputCompression: 90,
  count: 1,
};

/**
 * Ramène des réglages vers des valeurs réellement prises en charge par le modèle choisi
 * (ex. 16:9 indisponible → carré, transparence impossible → automatique).
 */
export function coerceSettings(settings: ComposerSettings, model: ModelInfo, maxImages: number): ComposerSettings {
  const next = { ...settings, model: model.id };
  if (!model.formats.some((f) => f.aspect === next.aspect)) next.aspect = model.formats[0]?.aspect ?? "square";
  if (!model.qualities.includes(next.quality)) next.quality = model.qualities[0] ?? "auto";
  if (!model.outputFormats.includes(next.outputFormat)) next.outputFormat = model.outputFormats[0] ?? "png";
  if (next.background === "transparent") {
    if (!model.supportsTransparency) next.background = "auto";
    else if (next.outputFormat === "jpeg") next.outputFormat = "png";
  }
  const limit = Math.max(1, Math.min(model.maxImages, maxImages));
  next.count = Math.min(Math.max(1, Math.round(next.count) || 1), limit);
  next.outputCompression = Math.min(100, Math.max(0, Math.round(next.outputCompression)));
  return next;
}

/** Réglages de composition reconstruits depuis une génération de l'historique. */
export function settingsFromGeneration(settings: GenerationSettings): ComposerSettings {
  return {
    model: settings.model,
    style: settings.style,
    aspect: settings.aspect,
    quality: settings.quality,
    background: settings.background,
    outputFormat: settings.outputFormat,
    outputCompression: settings.outputCompression ?? DEFAULT_SETTINGS.outputCompression,
    count: settings.count,
  };
}
