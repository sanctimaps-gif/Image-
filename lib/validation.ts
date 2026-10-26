import { z } from "zod";
import { MAX_PROMPT_LENGTH } from "@/lib/catalog";
import { AppError } from "@/lib/errors";
import type { ImageProvider } from "@/lib/image-providers/types";
import { normalizePrompt } from "@/lib/prompt";
import { cleanTemplateFields, validateTemplateFields } from "@/lib/templates";
import {
  ASPECT_IDS,
  BACKGROUND_IDS,
  OUTPUT_FORMAT_IDS,
  QUALITY_IDS,
  RESOLUTION_IDS,
  STYLE_IDS,
  TEMPLATE_IDS,
  type GenerationSettings,
  type ModelFormat,
  type ModelInfo,
} from "@/types/generation";

export const uuidSchema = z.uuid();

/** Schéma du corps de POST /api/generate. Toute clé inconnue est rejetée. */
export const generateRequestSchema = z.strictObject({
  prompt: z
    .string({ error: "La description est requise." })
    .transform(normalizePrompt)
    .pipe(
      z
        .string()
        .min(3, "Décrivez l'image en quelques mots au minimum.")
        .max(MAX_PROMPT_LENGTH, `La description ne doit pas dépasser ${MAX_PROMPT_LENGTH} caractères.`),
    ),
  providerId: z.string().max(64).optional(),
  model: z.string().max(64).optional(),
  style: z.enum(STYLE_IDS).default("none"),
  template: z.enum(TEMPLATE_IDS).default("none"),
  templateFields: z.record(z.string().max(32), z.string().max(1000)).default({}),
  aspect: z.enum(ASPECT_IDS).default("square"),
  resolution: z.enum(RESOLUTION_IDS).default("standard"),
  quality: z.enum(QUALITY_IDS).default("auto"),
  background: z.enum(BACKGROUND_IDS).default("auto"),
  outputFormat: z.enum(OUTPUT_FORMAT_IDS).default("png"),
  outputCompression: z.number().int().min(0).max(100).nullable().default(null),
  count: z.number().int().min(1).max(10).default(1),
  sourceImageId: uuidSchema.nullable().default(null),
});

export type GenerateRequestInput = z.input<typeof generateRequestSchema>;
export type GenerateRequest = z.output<typeof generateRequestSchema>;

export function parseGenerateRequest(body: unknown): GenerateRequest {
  const result = generateRequestSchema.safeParse(body);
  if (result.success) {
    const fieldError = validateTemplateFields(result.data.template, result.data.templateFields);
    if (fieldError) throw new AppError("VALIDATION_ERROR", fieldError);
    return { ...result.data, templateFields: cleanTemplateFields(result.data.template, result.data.templateFields) };
  }
  const first = result.error.issues[0];
  const field = first?.path[0];
  const message =
    field === "prompt" && first
      ? first.message
      : field !== undefined
        ? `Paramètre invalide : ${String(field)}.`
        : "Corps de requête invalide.";
  throw new AppError("VALIDATION_ERROR", message, { cause: result.error });
}

export interface ResolvedGeneration {
  provider: ImageProvider;
  model: ModelInfo;
  format: ModelFormat;
  /** Dimensions effectivement demandées (standard ou HD). */
  size: { size: string; width: number; height: number };
  settings: GenerationSettings;
}

/**
 * Vérifie la requête contre les capacités RÉELLES du fournisseur et du modèle.
 * Le navigateur n'est jamais considéré comme une source fiable.
 */
export function resolveGeneration(request: GenerateRequest, providers: ImageProvider[]): ResolvedGeneration {
  const provider = request.providerId ? providers.find((p) => p.id === request.providerId) : providers.find((p) => p.isConfigured());

  if (request.providerId && !provider) {
    throw new AppError("UNSUPPORTED_OPTION", "Fournisseur de génération inconnu.");
  }
  if (!provider || !provider.isConfigured()) {
    throw new AppError(
      "PROVIDER_NOT_CONFIGURED",
      "La génération d'images n'est pas configurée sur ce serveur. Consultez le README pour ajouter une clé API.",
    );
  }

  const models = provider.listModels();
  const modelId = request.model ?? provider.defaultModel();
  const model = models.find((m) => m.id === modelId);
  if (!model) throw new AppError("UNSUPPORTED_OPTION", "Ce modèle n'est pas disponible.");

  const format = model.formats.find((f) => f.aspect === request.aspect);
  if (!format) throw new AppError("UNSUPPORTED_OPTION", `Le format choisi n'est pas pris en charge par ${model.label}.`);

  if (request.resolution === "hd" && !format.hd) {
    throw new AppError("UNSUPPORTED_OPTION", `La haute définition n'est pas disponible pour ce format avec ${model.label}.`);
  }
  const size = request.resolution === "hd" && format.hd ? format.hd : format;

  if (!model.qualities.includes(request.quality)) {
    throw new AppError("UNSUPPORTED_OPTION", `Cette qualité n'est pas prise en charge par ${model.label}.`);
  }
  if (!model.outputFormats.includes(request.outputFormat)) {
    throw new AppError("UNSUPPORTED_OPTION", "Ce format de fichier n'est pas pris en charge.");
  }
  if (request.background === "transparent") {
    if (!model.supportsTransparency) {
      throw new AppError("UNSUPPORTED_OPTION", `Le fond transparent n'est pas disponible avec ${model.label}.`);
    }
    if (request.outputFormat === "jpeg") {
      throw new AppError("UNSUPPORTED_OPTION", "Le fond transparent nécessite le format PNG ou WebP.");
    }
  }
  if (request.count > model.maxImages) {
    throw new AppError("UNSUPPORTED_OPTION", `Vous pouvez générer au maximum ${model.maxImages} image(s) à la fois.`);
  }
  if (request.sourceImageId && (!model.supportsVariations || !provider.edit)) {
    throw new AppError("UNSUPPORTED_OPTION", `Les variantes ne sont pas disponibles avec ${model.label}.`);
  }

  const compression = request.outputFormat === "png" ? null : request.outputCompression;

  return {
    provider,
    model,
    format,
    size: { size: size.size, width: size.width, height: size.height },
    settings: {
      providerId: provider.id,
      model: model.id,
      style: request.style,
      template: request.template,
      aspect: format.aspect,
      resolution: request.resolution,
      quality: request.quality,
      background: request.background,
      outputFormat: request.outputFormat,
      outputCompression: compression,
      count: request.count,
    },
  };
}
