import { ApiClientError, type StudioBackend, downloadFilename } from "@/lib/backend";
import { IndexedDbGenerationStore } from "@/lib/browser/indexeddb-store";
import { isAppError } from "@/lib/errors";
import { GenerationService } from "@/lib/generation-service";
import type { ImageProvider } from "@/lib/image-providers/types";
import type { AppConfig, Generation } from "@/types/generation";

const OWNER = "local";

/**
 * Moteur de la version en ligne : la même validation et les mêmes prompts que le serveur,
 * un modèle d'IA libre exécuté sur l'appareil, et un historique conservé dans IndexedDB.
 * Aucun service d'IA externe n'est appelé.
 */
export class BrowserEngine implements StudioBackend {
  private readonly store: IndexedDbGenerationStore;
  private readonly service: GenerationService;
  private readonly objectUrls = new Map<string, string>();

  constructor(provider: ImageProvider, store?: IndexedDbGenerationStore) {
    this.store = store ?? new IndexedDbGenerationStore(60);
    this.service = new GenerationService({
      providers: [provider],
      store: this.store,
      hashOwnerId: () => OWNER,
      imageUrl: (id) => `idb:${id}`,
      limits: {
        requestsPerMinute: 30,
        imagesPerDay: 10_000,
        globalImagesPerDay: 10_000,
        maxImagesPerRequest: 1,
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

  async generate(...[payload, signal, onProgress]: Parameters<StudioBackend["generate"]>): Promise<Generation> {
    try {
      const generation = await this.service.generate({ body: payload, ownerId: OWNER, clientIp: null, signal, onProgress });
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
