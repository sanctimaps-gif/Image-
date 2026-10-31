/**
 * Types partagés entre le client et le serveur.
 * Aucun secret ni détail propre au fournisseur ne doit apparaître ici.
 */

export const STYLE_IDS = [
  "none",
  "photorealistic",
  "cinematic",
  "anime",
  "illustration",
  "digital-art",
  "3d-render",
  "fantasy",
  "minimalist",
  "watercolor",
  "pixel-art",
  "logo-design",
] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const ASPECT_IDS = ["square", "portrait", "landscape", "widescreen", "story"] as const;
export type AspectId = (typeof ASPECT_IDS)[number];

export const QUALITY_IDS = ["auto", "low", "medium", "high"] as const;
export type Quality = (typeof QUALITY_IDS)[number];

export const BACKGROUND_IDS = ["auto", "opaque", "transparent"] as const;
export type Background = (typeof BACKGROUND_IDS)[number];

export const RESOLUTION_IDS = ["standard", "hd"] as const;
export type Resolution = (typeof RESOLUTION_IDS)[number];

export const TEMPLATE_IDS = ["none", "poster", "character-sheet", "infographic", "sport-photo"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** Champs complémentaires d'un modèle créatif (titre, slogan, étapes…). */
export type TemplateFields = Record<string, string>;

export const OUTPUT_FORMAT_IDS = ["png", "jpeg", "webp"] as const;
export type OutputFormat = (typeof OUTPUT_FORMAT_IDS)[number];

/** Paramètres de génération après validation par le serveur. */
export interface GenerationSettings {
  providerId: string;
  model: string;
  style: StyleId;
  template: TemplateId;
  aspect: AspectId;
  resolution: Resolution;
  quality: Quality;
  background: Background;
  outputFormat: OutputFormat;
  /** Compression 0–100, uniquement pour jpeg/webp. */
  outputCompression: number | null;
  count: number;
}

export interface GeneratedImage {
  id: string;
  /** URL relative servie par l'application (jamais une URL du fournisseur). */
  url: string;
  width: number;
  height: number;
  mimeType: string;
}

export type GenerationKind = "text-to-image" | "variation";

export interface Generation {
  id: string;
  createdAt: string;
  kind: GenerationKind;
  prompt: string;
  /** Image d'origine pour une variante. */
  sourceImageId: string | null;
  /** Champs du modèle créatif utilisé (vide sans modèle). */
  templateFields: TemplateFields;
  settings: GenerationSettings;
  size: string;
  images: GeneratedImage[];
}

export interface ModelFormat {
  aspect: AspectId;
  /** Taille transmise à l'API, ex. "1536x1024". */
  size: string;
  width: number;
  height: number;
  /** Variante haute définition, si le modèle accepte des tailles libres. */
  hd?: { size: string; width: number; height: number };
}

/** Capacités réelles d'un modèle, exposées au client pour construire les contrôles. */
export interface ModelInfo {
  id: string;
  label: string;
  description: string;
  formats: ModelFormat[];
  qualities: Quality[];
  outputFormats: OutputFormat[];
  supportsTransparency: boolean;
  supportsVariations: boolean;
  maxImages: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  models: ModelInfo[];
  defaultModel: string | null;
}

export interface AppConfig {
  providers: ProviderInfo[];
  limits: {
    maxPromptLength: number;
    maxImagesPerRequest: number;
  };
  /** Historique stocké temporairement (ex. Vercel) : il peut être effacé. */
  ephemeralStorage: boolean;
  /** Phrase affichée sous « Vos créations » pour dire où l'historique est conservé. */
  historyNote?: string;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "PAYLOAD_TOO_LARGE"
  | "FORBIDDEN_ORIGIN"
  | "RATE_LIMITED"
  | "TOO_MANY_CONCURRENT"
  | "PROVIDER_NOT_CONFIGURED"
  | "UNSUPPORTED_OPTION"
  | "CONTENT_POLICY"
  | "PROVIDER_AUTH"
  | "PROVIDER_PERMISSION"
  | "PROVIDER_QUOTA"
  | "PROVIDER_RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_BAD_REQUEST"
  | "TIMEOUT"
  | "CANCELLED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    retryable: boolean;
    retryAfterSeconds?: number;
  };
}

/** Avancement d'une génération exécutée sur l'appareil (téléchargement du modèle puis calcul). */
export type GenerationProgressInfo =
  | { phase: "download"; loaded: number; total: number }
  | { phase: "generate"; ratio: number };

export interface GenerateResponse {
  generation: Generation;
}

export interface HistoryResponse {
  generations: Generation[];
}
