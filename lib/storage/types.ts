import type { Generation } from "@/types/generation";

export interface StoredImageFile {
  data: Buffer;
  mimeType: string;
}

/**
 * Persistance des générations et des fichiers image, cloisonnée par propriétaire.
 * L'implémentation fichier peut être remplacée par une base de données + stockage objet
 * (PostgreSQL + S3, par ex.) sans toucher aux routes.
 */
export interface GenerationStore {
  saveImage(ownerId: string, imageId: string, file: StoredImageFile): Promise<void>;
  readImage(ownerId: string, imageId: string): Promise<StoredImageFile | null>;
  addGeneration(ownerId: string, generation: Generation): Promise<void>;
  listGenerations(ownerId: string): Promise<Generation[]>;
  deleteGeneration(ownerId: string, generationId: string): Promise<boolean>;
  /** Supprime des fichiers image orphelins (ex. génération interrompue avant l'enregistrement). */
  deleteImages(ownerId: string, imageIds: string[]): Promise<void>;
}
