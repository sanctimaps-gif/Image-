import "server-only";
import os from "node:os";
import path from "node:path";
import { getServerEnv } from "@/lib/env";
import { GenerationService } from "@/lib/generation-service";
import { createProviders } from "@/lib/image-providers";
import { hashOwnerId } from "@/lib/owner";
import { FileGenerationStore } from "@/lib/storage/file-store";

const globalForService = globalThis as unknown as { __visionaiService?: GenerationService };

/**
 * Service unique par processus (conservé entre les rechargements à chaud en développement),
 * afin que les limiteurs en mémoire soient partagés par toutes les requêtes.
 */
export function getGenerationService(): GenerationService {
  if (!globalForService.__visionaiService) {
    const env = getServerEnv();
    globalForService.__visionaiService = new GenerationService({
      providers: createProviders(),
      store: new FileGenerationStore(resolveStorageDir(env.STORAGE_DIR, Boolean(env.VERCEL)), env.HISTORY_LIMIT),
      hashOwnerId,
      ephemeralStorage: !env.STORAGE_DIR && Boolean(env.VERCEL),
      limits: {
        requestsPerMinute: env.RATE_LIMIT_REQUESTS_PER_MINUTE,
        imagesPerDay: env.RATE_LIMIT_IMAGES_PER_DAY,
        globalImagesPerDay: env.RATE_LIMIT_GLOBAL_IMAGES_PER_DAY,
        maxImagesPerRequest: env.MAX_IMAGES_PER_REQUEST,
        maxConcurrentPerClient: env.MAX_CONCURRENT_GENERATIONS_PER_CLIENT,
      },
    });
  }
  return globalForService.__visionaiService;
}

/**
 * Sur Vercel, seul le dossier temporaire est inscriptible : l'historique y fonctionne
 * mais peut être effacé quand l'instance est recyclée.
 */
function resolveStorageDir(configured: string, serverless: boolean): string {
  if (configured) return path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
  if (serverless) return path.join(/*turbopackIgnore: true*/ os.tmpdir(), "visionai-data");
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".data");
}
