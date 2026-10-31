import type { GenerationStore, StoredImageFile } from "@/lib/storage/types";
import type { Generation } from "@/types/generation";

const DB_NAME = "visionai";
const DB_VERSION = 1;
const GENERATIONS = "generations";
const IMAGES = "images";

interface StoredImageRecord {
  id: string;
  data: Blob;
  mimeType: string;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Historique de la version statique : générations et images conservées dans le navigateur
 * (IndexedDB). Rien n'est envoyé à un serveur VisionAI.
 */
export class IndexedDbGenerationStore implements GenerationStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly historyLimit: number) {}

  private db(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, DB_VERSION);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains(GENERATIONS)) db.createObjectStore(GENERATIONS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES, { keyPath: "id" });
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    return this.dbPromise;
  }

  async saveImage(_ownerId: string, imageId: string, file: StoredImageFile): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(IMAGES, "readwrite");
    const record: StoredImageRecord = {
      id: imageId,
      data: new Blob([file.data as Uint8Array<ArrayBuffer>], { type: file.mimeType }),
      mimeType: file.mimeType,
    };
    tx.objectStore(IMAGES).put(record);
    await done(tx);
  }

  async readImage(_ownerId: string, imageId: string): Promise<StoredImageFile | null> {
    const blob = await this.readImageBlob(imageId);
    if (!blob) return null;
    return { data: new Uint8Array(await blob.arrayBuffer()), mimeType: blob.type };
  }

  async readImageBlob(imageId: string): Promise<Blob | null> {
    const db = await this.db();
    const record = (await request(db.transaction(IMAGES).objectStore(IMAGES).get(imageId))) as StoredImageRecord | undefined;
    return record?.data ?? null;
  }

  async addGeneration(_ownerId: string, generation: Generation): Promise<void> {
    const list = await this.listGenerations();
    const evicted = list.filter((g) => g.id !== generation.id).slice(this.historyLimit - 1);
    const db = await this.db();
    const tx = db.transaction([GENERATIONS, IMAGES], "readwrite");
    tx.objectStore(GENERATIONS).put(generation);
    for (const old of evicted) {
      tx.objectStore(GENERATIONS).delete(old.id);
      for (const image of old.images) tx.objectStore(IMAGES).delete(image.id);
    }
    await done(tx);
  }

  async listGenerations(): Promise<Generation[]> {
    const db = await this.db();
    const all = (await request(db.transaction(GENERATIONS).objectStore(GENERATIONS).getAll())) as Generation[];
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async deleteGeneration(_ownerId: string, generationId: string): Promise<boolean> {
    const db = await this.db();
    const existing = (await request(db.transaction(GENERATIONS).objectStore(GENERATIONS).get(generationId))) as
      | Generation
      | undefined;
    if (!existing) return false;
    const tx = db.transaction([GENERATIONS, IMAGES], "readwrite");
    tx.objectStore(GENERATIONS).delete(generationId);
    for (const image of existing.images) tx.objectStore(IMAGES).delete(image.id);
    await done(tx);
    return true;
  }

  async deleteImages(_ownerId: string, imageIds: string[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(IMAGES, "readwrite");
    for (const id of imageIds) tx.objectStore(IMAGES).delete(id);
    await done(tx);
  }
}
