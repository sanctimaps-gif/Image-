import { describe, expect, it } from "vitest";
import { GenerationService } from "@/lib/generation-service";
import { LOCAL_MODEL } from "@/lib/local-ai/local-provider";
import type { GenerationStore } from "@/lib/storage/types";
import type { Generation } from "@/types/generation";
import { FakeProvider, fakePng } from "./support/fixtures";

/** Stockage en mémoire, suffisant pour tester l'orchestration. */
function memoryStore(): GenerationStore {
  const generations: Generation[] = [];
  return {
    saveImage: async () => {},
    readImage: async () => null,
    addGeneration: async (_o, g) => void generations.unshift(g),
    listGenerations: async () => generations,
    deleteGeneration: async () => true,
    deleteImages: async () => {},
  };
}

function setup() {
  const provider = new FakeProvider();
  provider.models = [LOCAL_MODEL];
  provider.nextResult = async (req) => ({
    images: [{ data: fakePng(384, 384), mimeType: "image/png" }],
    size: req.size,
    revisedPrompt: req.enhancePrompt ? "A ginger cat sitting on a blue sofa in a sunlit living room" : null,
  });
  const service = new GenerationService({
    providers: [provider],
    store: memoryStore(),
    hashOwnerId: () => "x",
    limits: { requestsPerMinute: 100, imagesPerDay: 100, globalImagesPerDay: 100, maxImagesPerRequest: 1, maxConcurrentPerClient: 1 },
  });
  return { provider, service };
}

describe("étape de compréhension de la demande", () => {
  it("demande la réécriture et conserve la consigne comprise", async () => {
    const { provider, service } = setup();
    const generation = await service.generate({
      body: { prompt: "Un chat roux assis sur un canapé bleu", enhancePrompt: true },
      ownerId: "o",
      clientIp: null,
    });
    expect(provider.generateCalls[0]!.enhancePrompt).toBe(true);
    expect(generation.prompt).toBe("Un chat roux assis sur un canapé bleu");
    expect(generation.revisedPrompt).toMatch(/ginger cat/);
  });

  it("ne réécrit pas les types de création, déjà structurés", async () => {
    const { provider, service } = setup();
    await service.generate({
      body: { prompt: "Un joueur de water-polo", enhancePrompt: true, template: "sport-photo" },
      ownerId: "o",
      clientIp: null,
    });
    expect(provider.generateCalls[0]!.enhancePrompt).toBe(false);
  });

  it("ignore l'option pour un modèle qui ne sait pas réécrire", async () => {
    const { provider, service } = setup();
    provider.models = [{ ...LOCAL_MODEL, supportsPromptEnhancement: false }];
    const generation = await service.generate({ body: { prompt: "Un phare", enhancePrompt: true }, ownerId: "o", clientIp: null });
    expect(provider.generateCalls[0]!.enhancePrompt).toBe(false);
    expect(generation.revisedPrompt).toBeNull();
  });
});
