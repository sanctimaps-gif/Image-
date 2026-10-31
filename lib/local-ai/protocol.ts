/** Messages échangés entre l'interface et le worker qui exécute le modèle local. */

export const LOCAL_MODEL_ID = "onnx-community/Janus-Pro-1B-ONNX";
/** Janus-Pro produit des images carrées de 384×384 px. */
export const LOCAL_IMAGE_SIZE = 384;

export type WorkerRequest =
  | { type: "generate"; id: number; prompt: string; assetBase: string | null }
  | { type: "interrupt" };

export type LocalErrorCode = "WEBGPU_UNAVAILABLE" | "DOWNLOAD_FAILED" | "OUT_OF_MEMORY" | "INTERRUPTED" | "FAILED";

export type WorkerResponse =
  | { type: "progress"; id: number; phase: "download"; loaded: number; total: number }
  | { type: "progress"; id: number; phase: "generate"; ratio: number }
  | { type: "done"; id: number; png: ArrayBuffer }
  | { type: "error"; id: number; code: LocalErrorCode; detail: string };
