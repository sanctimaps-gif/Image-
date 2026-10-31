import { MAX_PROMPT_LENGTH } from "@/lib/catalog";
import { AppError, isAppError } from "@/lib/errors";
import { detectImageMime, readImageSize } from "@/lib/image-format";
import type { ImageProvider, ProviderResult } from "@/lib/image-providers/types";
import { buildPrompt } from "@/lib/prompt";
import { ConcurrencyLimiter, DailyQuota, SlidingWindowLimiter } from "@/lib/rate-limit";
import type { GenerationStore } from "@/lib/storage/types";
import { parseGenerateRequest, resolveGeneration } from "@/lib/validation";
import type { AppConfig, GeneratedImage, Generation, GenerationProgressInfo } from "@/types/generation";

export interface GenerationLimits {
  requestsPerMinute: number;
  imagesPerDay: number;
  globalImagesPerDay: number;
  maxImagesPerRequest: number;
  maxConcurrentPerClient: number;
}

export interface GenerationServiceDeps {
  providers: ImageProvider[];
  store: GenerationStore;
  limits: GenerationLimits;
  /** Hachage de l'identifiant client transmis au fournisseur. */
  hashOwnerId: (ownerId: string) => string;
  /** Vrai si l'historique peut disparaître (stockage temporaire d'une plateforme serverless). */
  ephemeralStorage?: boolean;
  /** URL publique d'une image stockée (par défaut la route serveur /api/images/:id). */
  imageUrl?: (imageId: string) => string;
  now?: () => number;
}

export interface GenerateCommand {
  body: unknown;
  ownerId: string;
  clientIp: string | null;
  signal?: AbortSignal;
  onProgress?: (progress: GenerationProgressInfo) => void;
}

const GLOBAL_KEY = "global";

/** Orchestration d'une génération : validation, quotas, appel fournisseur, persistance. */
export class GenerationService {
  private readonly perMinute: SlidingWindowLimiter;
  private readonly daily: DailyQuota;
  private readonly globalDaily: DailyQuota;
  private readonly concurrency: ConcurrencyLimiter;
  private readonly now: () => number;

  constructor(private readonly deps: GenerationServiceDeps) {
    this.now = deps.now ?? Date.now;
    this.perMinute = new SlidingWindowLimiter(deps.limits.requestsPerMinute, 60_000, this.now);
    this.daily = new DailyQuota(deps.limits.imagesPerDay, this.now);
    this.globalDaily = new DailyQuota(deps.limits.globalImagesPerDay, this.now);
    this.concurrency = new ConcurrencyLimiter(deps.limits.maxConcurrentPerClient);
  }

  get store(): GenerationStore {
    return this.deps.store;
  }

  getConfig(): AppConfig {
    return {
      providers: this.deps.providers.map((p) => ({
        id: p.id,
        name: p.name,
        configured: p.isConfigured(),
        models: p.listModels(),
        defaultModel: p.defaultModel(),
      })),
      limits: { maxPromptLength: MAX_PROMPT_LENGTH, maxImagesPerRequest: this.deps.limits.maxImagesPerRequest },
      ephemeralStorage: this.deps.ephemeralStorage ?? false,
    };
  }

  async generate(command: GenerateCommand): Promise<Generation> {
    const request = parseGenerateRequest(command.body);
    const resolved = resolveGeneration(request, this.deps.providers);
    const { provider, size, settings } = resolved;

    const clientKeys = [`owner:${command.ownerId}`, ...(command.clientIp ? [`ip:${command.clientIp}`] : [])];

    const release = this.concurrency.acquire(command.ownerId);
    if (!release) {
      throw new AppError("TOO_MANY_CONCURRENT", "Une génération est déjà en cours. Patientez qu'elle se termine.", {
        retryAfterSeconds: 5,
      });
    }

    const reserved: string[] = [];
    try {
      for (const key of clientKeys) {
        const minute = this.perMinute.check(key);
        if (!minute.allowed) {
          throw new AppError("RATE_LIMITED", "Trop de générations rapprochées. Patientez quelques secondes.", {
            retryAfterSeconds: minute.retryAfterSeconds,
          });
        }
      }
      this.reserveQuota(clientKeys, settings.count, reserved);

      // Image source d'une variante : uniquement parmi les images de ce même client.
      const source = request.sourceImageId ? await this.loadSourceImage(command.ownerId, request.sourceImageId) : null;

      const providerRequest = {
        model: settings.model,
        prompt: buildPrompt(request.prompt, settings.style, settings.template, request.templateFields),
        size: size.size,
        count: settings.count,
        quality: settings.quality,
        background: settings.background,
        outputFormat: settings.outputFormat,
        outputCompression: settings.outputCompression,
        safetyIdentifier: this.deps.hashOwnerId(command.ownerId),
        signal: command.signal,
        onProgress: command.onProgress,
      };

      let result: ProviderResult;
      try {
        result =
          source && provider.edit
            ? await provider.edit({ ...providerRequest, sourceImage: source })
            : await provider.generate(providerRequest);
      } catch (error) {
        // Les refus de modération ne sont pas remboursés, pour décourager les tentatives répétées.
        if (!(isAppError(error) && error.code === "CONTENT_POLICY")) this.refundQuota(reserved, settings.count);
        reserved.length = 0;
        throw error;
      }

      // Même si le client a annulé entre-temps, les images produites (et facturées) sont conservées
      // dans l'historique plutôt que perdues.
      const generationId = crypto.randomUUID();
      const images: GeneratedImage[] = [];
      try {
        for (const image of result.images) {
          const mimeType = detectImageMime(image.data);
          if (!mimeType) continue; // donnée non reconnue comme image : jamais présentée comme un résultat
          const dimensions = readImageSize(image.data) ?? { width: size.width, height: size.height };
          const id = crypto.randomUUID();
          await this.deps.store.saveImage(command.ownerId, id, { data: image.data, mimeType });
          images.push({ id, url: this.deps.imageUrl?.(id) ?? `/api/images/${id}`, mimeType, ...dimensions });
        }
        if (images.length === 0) {
          throw new AppError("PROVIDER_UNAVAILABLE", "Le fournisseur a renvoyé un résultat illisible. Veuillez réessayer.");
        }

        const generation: Generation = {
          id: generationId,
          createdAt: new Date(this.now()).toISOString(),
          kind: source ? "variation" : "text-to-image",
          prompt: request.prompt,
          sourceImageId: request.sourceImageId,
          templateFields: request.templateFields,
          settings: { ...settings, count: images.length },
          size: result.size ?? `${images[0]!.width}x${images[0]!.height}`,
          images,
        };
        await this.deps.store.addGeneration(command.ownerId, generation);
        return generation;
      } catch (error) {
        await this.deps.store.deleteImages(command.ownerId, images.map((i) => i.id)).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      // Échec sans image livrée : le quota réservé est restitué.
      if (reserved.length > 0) this.refundQuota(reserved, settings.count);
      throw error;
    } finally {
      release();
    }
  }

  private reserveQuota(clientKeys: string[], count: number, reserved: string[]) {
    const global = this.globalDaily.consume(GLOBAL_KEY, count);
    if (!global.allowed) {
      throw new AppError("RATE_LIMITED", "Le volume quotidien de générations du service est atteint. Revenez demain.", {
        retryAfterSeconds: global.retryAfterSeconds,
      });
    }
    reserved.push(GLOBAL_KEY);
    for (const key of clientKeys) {
      const quota = this.daily.consume(key, count);
      if (!quota.allowed) {
        this.refundQuota(reserved, count);
        reserved.length = 0;
        throw new AppError(
          "RATE_LIMITED",
          `Limite quotidienne atteinte (${this.deps.limits.imagesPerDay} images par jour). Revenez demain ou réduisez le nombre d'images.`,
          { retryAfterSeconds: quota.retryAfterSeconds },
        );
      }
      reserved.push(key);
    }
  }

  private refundQuota(reserved: string[], count: number) {
    for (const key of reserved) {
      if (key === GLOBAL_KEY) this.globalDaily.refund(key, count);
      else this.daily.refund(key, count);
    }
  }

  private async loadSourceImage(ownerId: string, imageId: string) {
    const history = await this.deps.store.listGenerations(ownerId);
    const known = history.some((g) => g.images.some((i) => i.id === imageId));
    const file = known ? await this.deps.store.readImage(ownerId, imageId) : null;
    if (!file) throw new AppError("NOT_FOUND", "L'image d'origine est introuvable ou a été supprimée.");
    const ext = file.mimeType === "image/jpeg" ? "jpg" : file.mimeType.split("/")[1];
    return { data: file.data, mimeType: file.mimeType, filename: `source.${ext}` };
  }
}
