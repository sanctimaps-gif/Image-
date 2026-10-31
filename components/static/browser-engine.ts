import { BrowserEngine } from "@/lib/browser/engine";
import { createJanusWorker, LocalImageProvider } from "@/lib/local-ai/local-provider";

let engine: BrowserEngine | null = null;

/**
 * Moteur unique de la version en ligne : le studio et l'entraînement partagent le même worker,
 * donc le modèle n'est chargé qu'une fois.
 */
export function getBrowserEngine(): BrowserEngine {
  if (!engine) {
    const basePath = process.env.NEXT_PUBLIC_VISIONAI_BASE_PATH;
    // Le moteur ONNX Runtime est servi par le site (copié dans /ort/ par scripts/build-pages.mjs).
    const assetBase = basePath !== undefined ? `${window.location.origin}${basePath}/ort/` : null;
    engine = new BrowserEngine(new LocalImageProvider(createJanusWorker, assetBase));
  }
  return engine;
}
