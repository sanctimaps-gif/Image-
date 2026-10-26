import type { ApiErrorBody, ApiErrorCode, GenerateResponse, Generation, HistoryResponse } from "@/types/generation";
import type { GenerateRequestInput } from "@/lib/validation";

/** Erreur côté client, toujours accompagnée d'un message affichable. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorCode | "NETWORK_ERROR",
    readonly retryable: boolean,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(input: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, { ...init, credentials: "same-origin", cache: "no-store" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError("La génération a été annulée.", "CANCELLED", true);
    }
    throw new ApiClientError("Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.", "NETWORK_ERROR", true);
  }

  if (response.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Corps non JSON (proxy, page d'erreur…) : géré ci-dessous.
  }

  if (!response.ok) {
    const body = data as Partial<ApiErrorBody> | null;
    if (body?.error?.message) {
      throw new ApiClientError(body.error.message, body.error.code ?? "INTERNAL_ERROR", body.error.retryable ?? true, body.error.retryAfterSeconds);
    }
    throw new ApiClientError(`Le serveur a répondu avec une erreur (${response.status}).`, "INTERNAL_ERROR", response.status >= 500);
  }
  return data as T;
}

export async function generateImages(payload: GenerateRequestInput, signal?: AbortSignal): Promise<Generation> {
  const { generation } = await request<GenerateResponse>("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  return generation;
}

export async function fetchHistory(signal?: AbortSignal): Promise<Generation[]> {
  const { generations } = await request<HistoryResponse>("/api/generations", { signal });
  return generations;
}

export async function deleteGeneration(id: string): Promise<void> {
  await request<void>(`/api/generations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function downloadUrl(imageUrl: string): string {
  return `${imageUrl}?download=1`;
}
