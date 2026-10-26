import "server-only";
import { getServerEnv } from "@/lib/env";
import { OpenAIImageProvider } from "@/lib/image-providers/openai";
import type { ImageProvider } from "@/lib/image-providers/types";

export type { ImageProvider } from "@/lib/image-providers/types";

/**
 * Registre des fournisseurs. Pour en ajouter un, instanciez-le ici :
 * l'interface et la validation s'adaptent automatiquement à ses capacités.
 */
export function createProviders(): ImageProvider[] {
  const env = getServerEnv();
  return [
    new OpenAIImageProvider({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL,
      enabledModels: env.OPENAI_IMAGE_MODELS,
      defaultModel: env.OPENAI_IMAGE_DEFAULT_MODEL,
      timeoutMs: env.OPENAI_TIMEOUT_MS,
      maxImagesPerRequest: env.MAX_IMAGES_PER_REQUEST,
    }),
  ];
}
