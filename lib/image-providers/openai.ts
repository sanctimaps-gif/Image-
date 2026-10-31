import "server-only";
import OpenAI, { toFile } from "openai";
import type { ImageEditParamsNonStreaming, ImageGenerateParamsNonStreaming, ImagesResponse } from "openai/resources/images";
import { AppError, isAppError } from "@/lib/errors";
import { resolveEnabledModels, type OpenAIModelSpec } from "@/lib/image-providers/openai-models";
import type {
  ImageProvider,
  ProviderEditRequest,
  ProviderGenerateRequest,
  ProviderResult,
} from "@/lib/image-providers/types";
import type { ModelInfo, OutputFormat } from "@/types/generation";

export interface OpenAIProviderOptions {
  apiKey: string;
  baseURL?: string;
  enabledModels: string;
  defaultModel: string;
  timeoutMs: number;
  maxImagesPerRequest: number;
}

const MIME: Record<OutputFormat, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

export class OpenAIImageProvider implements ImageProvider {
  readonly id = "openai";
  readonly name = "OpenAI Images";

  private readonly models: OpenAIModelSpec[];
  private readonly options: OpenAIProviderOptions;
  private client: OpenAI | null = null;

  constructor(options: OpenAIProviderOptions) {
    this.options = options;
    this.models = resolveEnabledModels(options.enabledModels, options.maxImagesPerRequest);
  }

  isConfigured(): boolean {
    return this.options.apiKey.length > 0 && this.models.length > 0;
  }

  listModels(): ModelInfo[] {
    // On ne transmet au client que les champs publics de ModelInfo.
    return this.models.map((spec) => {
      const info: ModelInfo & { editInputFidelity?: unknown } = { ...spec };
      delete info.editInputFidelity;
      return info;
    });
  }

  defaultModel(): string | null {
    const preferred = this.models.find((m) => m.id === this.options.defaultModel);
    return (preferred ?? this.models[0])?.id ?? null;
  }

  async generate(request: ProviderGenerateRequest): Promise<ProviderResult> {
    const params: ImageGenerateParamsNonStreaming = {
      model: request.model,
      prompt: request.prompt,
      n: request.count,
      size: request.size,
      quality: request.quality,
      background: request.background,
      output_format: request.outputFormat,
      moderation: "auto",
      safety_identifier: request.safetyIdentifier,
      ...(request.outputCompression !== null && { output_compression: request.outputCompression }),
    };
    return this.run(request, () => this.getClient().images.generate(params, { signal: request.signal }));
  }

  async edit(request: ProviderEditRequest): Promise<ProviderResult> {
    const spec = this.models.find((m) => m.id === request.model);
    const image = await toFile(request.sourceImage.data, request.sourceImage.filename, {
      type: request.sourceImage.mimeType,
    });
    const params: ImageEditParamsNonStreaming = {
      model: request.model,
      image,
      prompt: request.prompt,
      n: request.count,
      size: request.size,
      quality: request.quality,
      background: request.background,
      output_format: request.outputFormat,
      safety_identifier: request.safetyIdentifier,
      ...(request.outputCompression !== null && { output_compression: request.outputCompression }),
      ...(spec?.editInputFidelity && { input_fidelity: spec.editInputFidelity }),
    };
    return this.run(request, () => this.getClient().images.edit(params, { signal: request.signal }));
  }

  private getClient(): OpenAI {
    if (!this.isConfigured()) {
      throw new AppError(
        "PROVIDER_NOT_CONFIGURED",
        "La génération d'images n'est pas configurée : ajoutez OPENAI_API_KEY dans le fichier .env.local du serveur.",
      );
    }
    this.client ??= new OpenAI({
      apiKey: this.options.apiKey,
      baseURL: this.options.baseURL,
      timeout: this.options.timeoutMs,
      // Une génération coûte cher et peut être longue : une seule nouvelle tentative automatique.
      maxRetries: 1,
    });
    return this.client;
  }

  private async run(request: ProviderGenerateRequest, call: () => Promise<ImagesResponse>): Promise<ProviderResult> {
    let response: ImagesResponse;
    try {
      response = await call();
    } catch (error) {
      throw mapOpenAIError(error, request.signal);
    }
    return parseResponse(response, request.outputFormat);
  }
}

export function parseResponse(response: ImagesResponse, requestedFormat: OutputFormat): ProviderResult {
  const format = response.output_format ?? requestedFormat;
  const images = (response.data ?? [])
    .map((item) => item.b64_json)
    .filter((b64): b64 is string => typeof b64 === "string" && b64.length > 0)
    .map((b64) => ({ data: decodeBase64(b64), mimeType: MIME[format] }))
    .filter((img) => img.data.length > 0);

  if (images.length === 0) {
    // Ne jamais présenter une génération comme réussie sans image réelle.
    throw new AppError("PROVIDER_UNAVAILABLE", "Le fournisseur n'a renvoyé aucune image. Veuillez réessayer.");
  }
  return { images, size: response.size ?? null };
}

/** Traduit les erreurs du SDK OpenAI en erreurs applicatives compréhensibles, sans fuite de détails internes. */
export function mapOpenAIError(error: unknown, signal?: AbortSignal): AppError {
  if (isAppError(error)) return error;
  if (signal?.aborted || error instanceof OpenAI.APIUserAbortError) {
    return new AppError("CANCELLED", "La génération a été annulée.", { cause: error });
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new AppError("TIMEOUT", "Le fournisseur a mis trop de temps à répondre. Veuillez réessayer.", { cause: error });
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return new AppError("PROVIDER_UNAVAILABLE", "Impossible de joindre le service de génération. Vérifiez la connexion du serveur.", {
      cause: error,
    });
  }
  if (error instanceof OpenAI.APIError) {
    const code = typeof error.code === "string" ? error.code : "";
    const status = error.status ?? 0;
    if (code === "moderation_blocked" || code === "content_policy_violation" || /safety system/i.test(error.message)) {
      return new AppError(
        "CONTENT_POLICY",
        "Cette demande a été refusée par les règles de sécurité du fournisseur. Reformulez votre description.",
        { cause: error },
      );
    }
    if (status === 401) {
      return new AppError("PROVIDER_AUTH", "La clé API du serveur est invalide ou révoquée. Contactez l'administrateur.", {
        cause: error,
      });
    }
    if (status === 403 || status === 404) {
      return new AppError(
        "PROVIDER_PERMISSION",
        "Ce modèle n'est pas accessible avec le compte configuré (une vérification de l'organisation OpenAI peut être requise). Essayez un autre modèle.",
        { cause: error },
      );
    }
    if (status === 429) {
      return code === "insufficient_quota"
        ? new AppError("PROVIDER_QUOTA", "Le quota du compte de génération est épuisé. Contactez l'administrateur.", { cause: error })
        : new AppError("PROVIDER_RATE_LIMITED", "Le service de génération est saturé. Réessayez dans quelques instants.", {
            cause: error,
            retryAfterSeconds: 20,
          });
    }
    if (status === 400) {
      return new AppError("PROVIDER_BAD_REQUEST", "Le fournisseur a refusé les paramètres de la demande. Modifiez les options et réessayez.", {
        cause: error,
      });
    }
    return new AppError("PROVIDER_UNAVAILABLE", "Le service de génération est momentanément indisponible. Veuillez réessayer.", {
      cause: error,
    });
  }
  return new AppError("INTERNAL_ERROR", "Une erreur inattendue est survenue pendant la génération.", { cause: error });
}

/** Décodage base64 disponible à la fois dans Node.js et dans le navigateur. */
function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
