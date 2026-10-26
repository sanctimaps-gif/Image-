import "server-only";
import { z } from "zod";

const booleanString = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const intString = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).catch(fallback).default(fallback);

const envSchema = z.object({
  OPENAI_API_KEY: z.string().trim().optional().default(""),
  OPENAI_BASE_URL: z.url().optional().or(z.literal("").transform(() => undefined)),
  OPENAI_IMAGE_MODELS: z.string().optional().default("gpt-image-2,gpt-image-1.5,gpt-image-1-mini"),
  OPENAI_IMAGE_DEFAULT_MODEL: z.string().optional().default("gpt-image-1.5"),
  OPENAI_TIMEOUT_MS: intString(240_000, 10_000, 900_000),
  // Vide : `.data` en local, dossier temporaire sur les plateformes serverless (disque en lecture seule).
  STORAGE_DIR: z.string().trim().optional().default(""),
  VERCEL: z.string().optional(),
  HISTORY_LIMIT: intString(100, 1, 1000),
  RATE_LIMIT_REQUESTS_PER_MINUTE: intString(6, 1, 1000),
  RATE_LIMIT_IMAGES_PER_DAY: intString(40, 1, 100_000),
  RATE_LIMIT_GLOBAL_IMAGES_PER_DAY: intString(400, 1, 1_000_000),
  MAX_IMAGES_PER_REQUEST: intString(4, 1, 10),
  MAX_CONCURRENT_GENERATIONS_PER_CLIENT: intString(2, 1, 20),
  TRUST_PROXY_HEADERS: booleanString,
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | undefined;

/** Lit et valide les variables d'environnement serveur (une seule fois par processus). */
export function getServerEnv(): ServerEnv {
  cached ??= envSchema.parse(process.env);
  return cached;
}
