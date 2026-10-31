import { AppError } from "@/lib/errors";
import type { ImageProvider, ProviderGenerateRequest, ProviderResult } from "@/lib/image-providers/types";
import { LOCAL_IMAGE_SIZE, type LocalErrorCode, type WorkerRequest, type WorkerResponse } from "@/lib/local-ai/protocol";
import type { ModelInfo } from "@/types/generation";

export const LOCAL_MODEL: ModelInfo = {
  id: "janus-pro-1b",
  label: "Janus-Pro 1B (sur l'appareil)",
  description:
    "Modèle libre de DeepSeek (licence MIT) exécuté dans votre navigateur via WebGPU : images carrées 384 × 384 px, meilleurs résultats avec des descriptions en anglais.",
  formats: [{ aspect: "square", size: `${LOCAL_IMAGE_SIZE}x${LOCAL_IMAGE_SIZE}`, width: LOCAL_IMAGE_SIZE, height: LOCAL_IMAGE_SIZE }],
  qualities: ["auto"],
  outputFormats: ["png"],
  supportsTransparency: false,
  supportsVariations: false,
  maxImages: 1,
};

const MESSAGES: Record<Exclude<LocalErrorCode, "INTERRUPTED">, string> = {
  WEBGPU_UNAVAILABLE:
    "Ce navigateur ne prend pas en charge WebGPU, indispensable pour faire tourner l'IA sur l'appareil. Utilisez Safari sur iOS 26 ou plus récent, ou un Chrome / Edge récent sur ordinateur ou Android.",
  DOWNLOAD_FAILED:
    "Le téléchargement du modèle a échoué (connexion interrompue ou espace de stockage insuffisant). Réessayez, de préférence en Wi-Fi.",
  OUT_OF_MEMORY:
    "Mémoire insuffisante sur cet appareil pour exécuter le modèle. Fermez les autres onglets et applications, ou utilisez un ordinateur.",
  FAILED: "Le modèle local a rencontré une erreur inattendue. Réessayez.",
};

export type WorkerFactory = () => Worker;

/**
 * Fournisseur « IA sur l'appareil » : aucun service d'IA externe, le calcul est fait par le navigateur.
 * Le worker est conservé entre deux générations pour ne charger le modèle qu'une fois.
 */
export class LocalImageProvider implements ImageProvider {
  readonly id = "local";
  readonly name = "IA sur l'appareil (Janus-Pro)";
  private worker: Worker | null = null;
  private nextId = 1;

  constructor(
    private readonly createWorker: WorkerFactory,
    private readonly assetBase: string | null,
  ) {}

  isConfigured(): boolean {
    return true;
  }

  listModels(): ModelInfo[] {
    return [LOCAL_MODEL];
  }

  defaultModel(): string {
    return LOCAL_MODEL.id;
  }

  generate(request: ProviderGenerateRequest): Promise<ProviderResult> {
    if (request.signal?.aborted) return Promise.reject(new AppError("CANCELLED", "La génération a été annulée."));
    const worker = (this.worker ??= this.createWorker());
    const id = this.nextId++;

    return new Promise<ProviderResult>((resolve, reject) => {
      const cleanup = () => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onCrash);
        request.signal?.removeEventListener("abort", onAbort);
      };
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.id !== id) return;
        if (message.type === "progress") {
          request.onProgress?.(
            message.phase === "download"
              ? { phase: "download", loaded: message.loaded, total: message.total }
              : { phase: "generate", ratio: message.ratio },
          );
          return;
        }
        cleanup();
        if (message.type === "done") {
          resolve({ images: [{ data: new Uint8Array(message.png), mimeType: "image/png" }], size: LOCAL_MODEL.formats[0]!.size });
        } else if (message.code === "INTERRUPTED") {
          reject(new AppError("CANCELLED", "La génération a été annulée."));
        } else {
          console.error("[visionai] modèle local :", message.code, message.detail);
          reject(new AppError(message.code === "FAILED" ? "INTERNAL_ERROR" : "PROVIDER_UNAVAILABLE", MESSAGES[message.code]));
        }
      };
      const onCrash = (event: ErrorEvent) => {
        cleanup();
        // Un worker qui plante (souvent faute de mémoire) est recréé à la prochaine génération.
        worker.terminate();
        if (this.worker === worker) this.worker = null;
        console.error("[visionai] le worker du modèle local s'est arrêté :", event.message);
        reject(new AppError("PROVIDER_UNAVAILABLE", MESSAGES.OUT_OF_MEMORY));
      };
      const onAbort = () => {
        cleanup();
        worker.postMessage({ type: "interrupt" } satisfies WorkerRequest);
        reject(new AppError("CANCELLED", "La génération a été annulée."));
      };

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onCrash);
      request.signal?.addEventListener("abort", onAbort, { once: true });
      worker.postMessage({ type: "generate", id, prompt: request.prompt, assetBase: this.assetBase } satisfies WorkerRequest);
    });
  }
}

/** Création du worker (fichier séparé pour que le bundler produise un script dédié). */
export function createJanusWorker(): Worker {
  return new Worker(new URL("./janus.worker.ts", import.meta.url), { type: "module", name: "visionai-janus" });
}
