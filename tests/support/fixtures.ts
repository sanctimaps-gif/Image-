import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  ImageProvider,
  ProviderEditRequest,
  ProviderGenerateRequest,
  ProviderResult,
} from "@/lib/image-providers/types";
import { OPENAI_IMAGE_MODELS } from "@/lib/image-providers/openai-models";
import type { ModelInfo } from "@/types/generation";

/** En-tête PNG minimal (signature + IHDR) aux dimensions demandées. */
export function fakePng(width = 1024, height = 1024): Buffer {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

export function publicModel(id: string): ModelInfo {
  const spec = { ...OPENAI_IMAGE_MODELS[id]! } as ModelInfo & { editInputFidelity?: unknown };
  delete spec.editInputFidelity;
  return { ...spec, maxImages: 4 };
}

/** Fournisseur de test : enregistre les appels et renvoie des octets d'image fournis par le test. */
export class FakeProvider implements ImageProvider {
  readonly id = "fake";
  readonly name = "Fake";
  configured = true;
  models: ModelInfo[] = [publicModel("gpt-image-1.5"), publicModel("gpt-image-2")];
  generateCalls: ProviderGenerateRequest[] = [];
  editCalls: ProviderEditRequest[] = [];
  nextResult: (req: ProviderGenerateRequest) => Promise<ProviderResult> = async (req) => ({
    images: Array.from({ length: req.count }, () => ({ data: fakePng(), mimeType: "image/png" })),
    size: req.size,
  });

  isConfigured() {
    return this.configured;
  }
  listModels() {
    return this.models;
  }
  defaultModel() {
    return this.models[0]?.id ?? null;
  }
  async generate(request: ProviderGenerateRequest) {
    this.generateCalls.push(request);
    return this.nextResult(request);
  }
  async edit(request: ProviderEditRequest) {
    this.editCalls.push(request);
    return this.nextResult(request);
  }
}

export async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "visionai-test-"));
}
