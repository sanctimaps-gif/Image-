import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileGenerationStore } from "@/lib/storage/file-store";
import type { Generation } from "@/types/generation";
import { fakePng, makeTempDir } from "./support/fixtures";

let dir: string;
beforeEach(async () => {
  dir = await makeTempDir();
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

function generation(imageId: string): Generation {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    kind: "text-to-image",
    prompt: "test",
    sourceImageId: null,
    templateFields: {},
    size: "1024x1024",
    settings: {
      providerId: "openai",
      model: "gpt-image-1.5",
      style: "none",
      template: "none",
      aspect: "square",
      resolution: "standard",
      quality: "auto",
      background: "auto",
      outputFormat: "png",
      outputCompression: null,
      count: 1,
    },
    images: [{ id: imageId, url: `/api/images/${imageId}`, width: 1024, height: 1024, mimeType: "image/png" }],
  };
}

describe("FileGenerationStore", () => {
  it("conserve au plus N générations et supprime les images évincées", async () => {
    const store = new FileGenerationStore(dir, 2);
    const owner = randomUUID();
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of ids) {
      await store.saveImage(owner, id, { data: fakePng(), mimeType: "image/png" });
      await store.addGeneration(owner, generation(id));
    }
    const list = await store.listGenerations(owner);
    expect(list.map((g) => g.images[0]!.id)).toEqual([ids[2], ids[1]]);
    expect(await store.readImage(owner, ids[0]!)).toBeNull();
    expect(await store.readImage(owner, ids[2]!)).not.toBeNull();
  });

  it("sérialise les écritures concurrentes sans perte", async () => {
    const store = new FileGenerationStore(dir, 100);
    const owner = randomUUID();
    await Promise.all(Array.from({ length: 10 }, () => store.addGeneration(owner, generation(randomUUID()))));
    expect(await store.listGenerations(owner)).toHaveLength(10);
  });

  it("refuse les identifiants pouvant provoquer une traversée de répertoire", async () => {
    const store = new FileGenerationStore(dir, 10);
    await expect(store.readImage("../../etc", "passwd")).rejects.toThrow();
    await expect(store.saveImage(randomUUID(), "../evil", { data: fakePng(), mimeType: "image/png" })).rejects.toThrow();
  });
});
