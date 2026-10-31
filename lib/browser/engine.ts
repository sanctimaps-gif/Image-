import { ApiClientError, type StudioBackend, downloadFilename } from "@/lib/backend";
import { isAppError } from "@/lib/errors";
import { GenerationService } from "@/lib/generation-service";
import { OpenAIImageProvider } from "@/lib/image-providers/openai";
import { PollinationsImageProvider } from "@/lib/image-providers/pollinations";
import { IndexedDbGenerationStore } from "@/lib/browser/indexeddb-store";
import type { AppConfig, Generation } from "@/types/generation";

const OWNER = "local";
const OPENAI_MODELS = "gpt-image-2,gpt-image-1.5,gpt-image-1-mini";

/**
 * Moteur de la version statique : la même validation et les mêmes prompts que le serveur,
 * mais les appels partent directement du navigateur et l'historique reste dans IndexedDB.
 */
export class BrowserEngine implements StudioBackend {
  private readonly store: IndexedDbGenerationStore;
  private readonly service: GenerationService;
  private readonly objectUrls = new Map<string, string>();

  constructor(openaiApiKey: string | null, store?: IndexedDbGenerationStore) {
    this.store = store ?? new IndexedDbGenerationStore(60);
    this.service = new GenerationService({
      providers: [
        new PollinationsImageProvider(),
        new OpenAIImageProvider({
          apiKey: openaiApiKey ?? "",
          enabledModels: OPENAI_MODELS,
          defaultModel: "gpt-image-2",
          timeoutMs: 240_000,
          maxImagesPerRequest: 4,
          browser: true,
        }),
      ],
      store: this.store,
      hashOwnerId: () => "visionai-static",
      imageUrl: (id) => `idb:${id}`,
      limits: {
        requestsPerMinute: 10,
        imagesPerDay: 500,
        globalImagesPerDay: 500,
        maxImagesPerRequest: 4,
        maxConcurrentPerClient: 1,
      },
    });
  }

  getConfig(): AppConfig {
    return {
      ...this.service.getConfig(),
      ephemeralStorage: false,
      historyNote: "Conservées uniquement dans ce navigateur, sur cet appareil.",
    };
  }

  async generate(payload: Parameters<StudioBackend["generate"]>[0], signal?: AbortSignal): Promise<Generation> {
    try {
      const generation = await this.service.generate({ body: payload, ownerId: OWNER, clientIp: null, signal });
      return this.withObjectUrls(generation);
    } catch (error) {
      throw toClientError(error);
    }
  }

  async list(): Promise<Generation[]> {
    try {
      const generations = await this.store.listGenerations();
      return Promise.all(generations.map((g) => this.withObjectUrls(g)));
    } catch (error) {
      throw toClientError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.store.deleteGeneration(OWNER, id);
    if (!deleted) throw new ApiClientError("Cette création est introuvable.", "NOT_FOUND", false);
  }

  download(image: Generation["images"][number]) {
    return { href: image.url, filename: downloadFilename(image) };
  }

  /** Les images stockées sont exposées à l'interface sous forme d'URL blob: locales. */
  private async withObjectUrls(generation: Generation): Promise<Generation> {
    const images = await Promise.all(
      generation.images.map(async (image) => {
        let url = this.objectUrls.get(image.id);
        if (!url) {
          const blob = await this.store.readImageBlob(image.id);
          url = blob ? URL.createObjectURL(blob) : "";
          if (url) this.objectUrls.set(image.id, url);
        }
        return { ...image, url };
      }),
    );
    return { ...generation, images };
  }
}

function toClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (isAppError(error)) return new ApiClientError(error.message, error.code, error.retryable, error.retryAfterSeconds);
  return new ApiClientError("Une erreur inattendue est survenue dans le navigateur.", "INTERNAL_ERROR", true);
}
