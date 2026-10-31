import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { GenerationStore, StoredImageFile } from "@/lib/storage/types";
import type { Generation } from "@/types/generation";

const SAFE_ID = /^[0-9a-f-]{36}$/i;
const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MIME_BY_EXT = Object.fromEntries(Object.entries(EXTENSIONS).map(([mime, ext]) => [ext, mime]));

const generationListSchema = z.array(z.looseObject({ id: z.string(), images: z.array(z.looseObject({ id: z.string() })) }));

/**
 * Stockage sur disque :
 *   <root>/history/<ownerId>.json          index des générations (le plus récent en premier)
 *   <root>/images/<ownerId>/<imageId>.<ext> fichiers image
 * Les écritures d'un même propriétaire sont sérialisées et atomiques (fichier temporaire + rename).
 */
export class FileGenerationStore implements GenerationStore {
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly root: string,
    private readonly historyLimit: number,
  ) {}

  async saveImage(ownerId: string, imageId: string, file: StoredImageFile): Promise<void> {
    const ext = EXTENSIONS[file.mimeType];
    if (!ext) throw new Error(`Type d'image non pris en charge : ${file.mimeType}`);
    const dir = this.imageDir(ownerId);
    await fs.mkdir(dir, { recursive: true });
    await writeAtomic(path.join(/*turbopackIgnore: true*/ dir, `${assertId(imageId)}.${ext}`), file.data);
  }

  async readImage(ownerId: string, imageId: string): Promise<StoredImageFile | null> {
    const dir = this.imageDir(ownerId);
    for (const ext of Object.values(EXTENSIONS)) {
      try {
        const data = await fs.readFile(path.join(/*turbopackIgnore: true*/ dir, `${assertId(imageId)}.${ext}`));
        return { data, mimeType: MIME_BY_EXT[ext]! };
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    }
    return null;
  }

  async addGeneration(ownerId: string, generation: Generation): Promise<void> {
    await this.withLock(ownerId, async () => {
      const list = await this.readHistory(ownerId);
      const next = [generation, ...list.filter((g) => g.id !== generation.id)];
      const kept = next.slice(0, this.historyLimit);
      const evicted = next.slice(this.historyLimit);
      await this.writeHistory(ownerId, kept);
      await this.removeImageFiles(ownerId, evicted.flatMap((g) => g.images.map((i) => i.id)));
    });
  }

  async listGenerations(ownerId: string): Promise<Generation[]> {
    return this.readHistory(ownerId);
  }

  async deleteGeneration(ownerId: string, generationId: string): Promise<boolean> {
    return this.withLock(ownerId, async () => {
      const list = await this.readHistory(ownerId);
      const target = list.find((g) => g.id === generationId);
      if (!target) return false;
      await this.writeHistory(
        ownerId,
        list.filter((g) => g.id !== generationId),
      );
      await this.removeImageFiles(ownerId, target.images.map((i) => i.id));
      return true;
    });
  }

  async deleteImages(ownerId: string, imageIds: string[]): Promise<void> {
    await this.removeImageFiles(ownerId, imageIds);
  }

  private async readHistory(ownerId: string): Promise<Generation[]> {
    try {
      const raw = await fs.readFile(this.historyFile(ownerId), "utf8");
      const parsed = generationListSchema.safeParse(JSON.parse(raw));
      return parsed.success ? (parsed.data as unknown as Generation[]) : [];
    } catch (error) {
      if (isNotFound(error)) return [];
      if (error instanceof SyntaxError) return [];
      throw error;
    }
  }

  private async writeHistory(ownerId: string, list: Generation[]) {
    await fs.mkdir(path.join(/*turbopackIgnore: true*/ this.root, "history"), { recursive: true });
    await writeAtomic(this.historyFile(ownerId), JSON.stringify(list));
  }

  private async removeImageFiles(ownerId: string, imageIds: string[]) {
    const dir = this.imageDir(ownerId);
    await Promise.all(
      imageIds.filter((id) => SAFE_ID.test(id)).flatMap((id) =>
        Object.values(EXTENSIONS).map((ext) => fs.rm(path.join(/*turbopackIgnore: true*/ dir, `${id}.${ext}`), { force: true })),
      ),
    );
  }

  private historyFile(ownerId: string) {
    return path.join(/*turbopackIgnore: true*/ this.root, "history", `${assertId(ownerId)}.json`);
  }

  private imageDir(ownerId: string) {
    return path.join(/*turbopackIgnore: true*/ this.root, "images", assertId(ownerId));
  }

  private withLock<T>(ownerId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(ownerId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    const tail = run.catch(() => undefined);
    this.locks.set(ownerId, tail);
    void tail.then(() => {
      if (this.locks.get(ownerId) === tail) this.locks.delete(ownerId);
    });
    return run;
  }
}

/** Empêche toute traversée de répertoire : seuls des UUID sont acceptés comme noms de fichiers. */
function assertId(id: string): string {
  if (!SAFE_ID.test(id)) throw new Error("Identifiant de stockage invalide.");
  return id.toLowerCase();
}

async function writeAtomic(file: string, data: string | Uint8Array) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, file);
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
