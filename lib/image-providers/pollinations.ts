import { AppError } from "@/lib/errors";
import type { ImageProvider, ProviderGenerateRequest, ProviderResult } from "@/lib/image-providers/types";
import type { ModelFormat, ModelInfo } from "@/types/generation";

/**
 * Fournisseur gratuit sans clé (pollinations.ai, accès anonyme), utilisé par la version
 * statique pour essayer l'application. Service tiers : limité à une image à la fois,
 * environ une toutes les 45 secondes, surface maximale ≈ 768×768 px, disponibilité non garantie.
 */
const ENDPOINT = "https://image.pollinations.ai/prompt/";
const TIMEOUT_MS = 120_000;
/** Le prompt voyage dans l'URL : on le borne pour rester sous les limites usuelles. */
const MAX_PROMPT_CHARS = 1800;

const fmt = (aspect: ModelFormat["aspect"], width: number, height: number): ModelFormat => ({
  aspect,
  size: `${width}x${height}`,
  width,
  height,
});

export const POLLINATIONS_MODEL: ModelInfo = {
  id: "flux",
  label: "Flux (gratuit)",
  description: "Essai gratuit sans clé via pollinations.ai : qualité et texte sur l'image limités, une image toutes les 45 s environ.",
  // Surfaces ≤ 768×768 px, dimensions multiples de 8.
  formats: [
    fmt("square", 768, 768),
    fmt("portrait", 624, 936),
    fmt("landscape", 936, 624),
    fmt("widescreen", 1024, 576),
    fmt("story", 576, 1024),
  ],
  qualities: ["auto"],
  outputFormats: ["jpeg"],
  supportsTransparency: false,
  supportsVariations: false,
  maxImages: 1,
};

export class PollinationsImageProvider implements ImageProvider {
  readonly id = "pollinations";
  readonly name = "Essai gratuit (Pollinations)";

  constructor(private readonly fetchImpl: typeof fetch = (...args) => fetch(...args)) {}

  isConfigured(): boolean {
    return true;
  }

  listModels(): ModelInfo[] {
    return [POLLINATIONS_MODEL];
  }

  defaultModel(): string {
    return POLLINATIONS_MODEL.id;
  }

  async generate(request: ProviderGenerateRequest): Promise<ProviderResult> {
    const [width, height] = request.size.split("x").map(Number);
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      seed: String(Math.floor(Math.random() * 2_000_000_000)),
      model: POLLINATIONS_MODEL.id,
    });
    const url = `${ENDPOINT}${encodeURIComponent(request.prompt.slice(0, MAX_PROMPT_CHARS))}?${params}`;

    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await this.fetchImpl(url, { signal });
    } catch (error) {
      if (request.signal?.aborted) throw new AppError("CANCELLED", "La génération a été annulée.", { cause: error });
      if (timeout.aborted) {
        throw new AppError("TIMEOUT", "Le service gratuit a mis trop de temps à répondre. Réessayez plus tard.", { cause: error });
      }
      throw new AppError(
        "PROVIDER_UNAVAILABLE",
        "Le service gratuit (pollinations.ai) est injoignable pour le moment. Réessayez plus tard ou utilisez votre clé OpenAI.",
        { cause: error },
      );
    }

    if (response.status === 429) {
      throw new AppError("PROVIDER_RATE_LIMITED", "Le service gratuit limite à une image toutes les 45 secondes environ. Patientez puis réessayez.", {
        retryAfterSeconds: 45,
      });
    }
    if (response.status === 401 || response.status === 402 || response.status === 403) {
      throw new AppError(
        "PROVIDER_PERMISSION",
        "Le service gratuit refuse la demande (il exige peut-être désormais une clé). Utilisez votre clé OpenAI.",
      );
    }
    if (!response.ok) {
      throw new AppError("PROVIDER_UNAVAILABLE", `Le service gratuit a renvoyé une erreur (${response.status}). Réessayez plus tard.`);
    }
    const data = new Uint8Array(await response.arrayBuffer());
    return { images: [{ data, mimeType: response.headers.get("content-type") ?? "image/jpeg" }], size: request.size };
  }
}
