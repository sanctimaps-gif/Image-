import type {
  AspectId,
  Background,
  GenerationSettings,
  ModelInfo,
  OutputFormat,
  Quality,
  Resolution,
  StyleId,
  TemplateFields,
  TemplateId,
} from "@/types/generation";

/** Réglages modifiables dans l'interface (le fournisseur est déduit du modèle). */
export interface ComposerSettings {
  model: string;
  style: StyleId;
  template: TemplateId;
  aspect: AspectId;
  resolution: Resolution;
  quality: Quality;
  background: Background;
  outputFormat: OutputFormat;
  outputCompression: number;
  count: number;
}

export const DEFAULT_SETTINGS: Omit<ComposerSettings, "model"> = {
  style: "none",
  template: "none",
  aspect: "square",
  resolution: "standard",
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
  if (next.resolution === "hd" && !model.formats.find((f) => f.aspect === next.aspect)?.hd) next.resolution = "standard";
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

/** Réglages de composition reconstruits depuis une génération de l'historique (anciennes entrées comprises). */
export function settingsFromGeneration(settings: GenerationSettings): ComposerSettings {
  return {
    model: settings.model,
    style: settings.style,
    template: settings.template ?? "none",
    aspect: settings.aspect,
    resolution: settings.resolution ?? "standard",
    quality: settings.quality,
    background: settings.background,
    outputFormat: settings.outputFormat,
    outputCompression: settings.outputCompression ?? DEFAULT_SETTINGS.outputCompression,
    count: settings.count,
  };
}

/** Réglages conseillés d'un modèle créatif, adaptés aux capacités du modèle d'image choisi. */
export function applyTemplateDefaults(
  settings: ComposerSettings,
  template: { id: TemplateId; recommended: { aspects: AspectId[]; quality: Quality; preferHd: boolean } },
  models: ModelInfo[],
  maxImages: number,
): ComposerSettings {
  // Les modèles créatifs reposent sur du texte lisible et des formats libres : gpt-image-2 en priorité.
  const model =
    template.id === "none"
      ? (models.find((m) => m.id === settings.model) ?? models[0])
      : (models.find((m) => m.id === "gpt-image-2") ?? models.find((m) => m.id === settings.model) ?? models[0]);
  if (!model) return { ...settings, template: template.id };
  const aspect = template.recommended.aspects.find((a) => model.formats.some((f) => f.aspect === a)) ?? settings.aspect;
  const hd = template.recommended.preferHd && Boolean(model.formats.find((f) => f.aspect === aspect)?.hd);
  return coerceSettings(
    {
      ...settings,
      template: template.id,
      model: model.id,
      aspect,
      resolution: hd ? "hd" : "standard",
      quality: template.id === "none" ? settings.quality : template.recommended.quality,
      style: template.id === "none" ? settings.style : "none",
      count: template.id === "none" ? settings.count : 1,
    },
    model,
    maxImages,
  );
}

export type { TemplateFields };
