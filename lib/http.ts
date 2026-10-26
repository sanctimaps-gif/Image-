import "server-only";
import { AppError } from "@/lib/errors";

export const MAX_JSON_BODY_BYTES = 16 * 1024;

/** Lit un corps JSON en refusant les requêtes trop volumineuses (même sans Content-Length fiable). */
export async function readJsonBody(request: Request, maxBytes = MAX_JSON_BODY_BYTES): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new AppError("VALIDATION_ERROR", "Le corps de la requête doit être au format JSON.");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw tooLarge();

  const reader = request.body?.getReader();
  if (!reader) throw new AppError("VALIDATION_ERROR", "Corps de requête manquant.");

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AppError("VALIDATION_ERROR", "Le corps de la requête n'est pas un JSON valide.", { cause: error });
  }
}

function tooLarge() {
  return new AppError("PAYLOAD_TOO_LARGE", "La requête est trop volumineuse.");
}

/**
 * Protection CSRF simple : les requêtes qui modifient l'état doivent provenir de la même origine.
 * Les navigateurs envoient toujours l'en-tête Origin sur les requêtes POST/DELETE en fetch.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") throw forbidden();
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden();
  }
  if (!host || originHost !== host) throw forbidden();
}

function forbidden() {
  return new AppError("FORBIDDEN_ORIGIN", "Requête refusée : origine non autorisée.");
}

/** Adresse IP du client, uniquement si les en-têtes du proxy sont déclarés fiables. */
export function getClientIp(request: Request, trustProxyHeaders: boolean): string | null {
  if (!trustProxyHeaders) return null;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : null;
}
