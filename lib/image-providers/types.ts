import type { Background, GenerationProgressInfo, ModelInfo, OutputFormat, Quality } from "@/types/generation";

/** Requête normalisée transmise à un fournisseur, après validation complète. */
export interface ProviderGenerateRequest {
  model: string;
  prompt: string;
  size: string;
  count: number;
  quality: Quality;
  background: Background;
  outputFormat: OutputFormat;
  outputCompression: number | null;
  /** Identifiant opaque (haché) de l'utilisateur final, pour la détection d'abus du fournisseur. */
  safetyIdentifier: string;
  signal?: AbortSignal;
  /** Faire réécrire la demande par le modèle de langage avant la génération. */
  enhancePrompt?: boolean;
  /** Avancement réel, pour les fournisseurs qui le connaissent (modèle local). */
  onProgress?: (progress: GenerationProgressInfo) => void;
}

export interface ProviderSourceImage {
  data: Uint8Array;
  mimeType: string;
  filename: string;
}

export interface ProviderEditRequest extends ProviderGenerateRequest {
  sourceImage: ProviderSourceImage;
}

export interface ProviderImage {
  data: Uint8Array;
  mimeType: string;
}

export interface ProviderResult {
  images: ProviderImage[];
  /** Taille effectivement produite, si le fournisseur la renvoie. */
  size: string | null;
  /** Consigne réellement utilisée, si le fournisseur l'a réécrite. */
  revisedPrompt?: string | null;
}

/**
 * Contrat que doit respecter tout fournisseur de génération d'images.
 * Pour ajouter un fournisseur (Stability, modèle open source auto-hébergé…),
 * implémentez cette interface puis enregistrez-le dans `lib/image-providers/index.ts`.
 */
export interface ImageProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  listModels(): ModelInfo[];
  defaultModel(): string | null;
  generate(request: ProviderGenerateRequest): Promise<ProviderResult>;
  /** Génère une variante à partir d'une image source. Absent si le fournisseur ne le permet pas. */
  edit?(request: ProviderEditRequest): Promise<ProviderResult>;
}
