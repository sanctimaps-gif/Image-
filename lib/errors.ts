import type { ApiErrorBody, ApiErrorCode } from "@/types/generation";

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PAYLOAD_TOO_LARGE: 413,
  FORBIDDEN_ORIGIN: 403,
  RATE_LIMITED: 429,
  TOO_MANY_CONCURRENT: 429,
  PROVIDER_NOT_CONFIGURED: 503,
  UNSUPPORTED_OPTION: 400,
  CONTENT_POLICY: 422,
  PROVIDER_AUTH: 502,
  PROVIDER_PERMISSION: 502,
  PROVIDER_QUOTA: 503,
  PROVIDER_RATE_LIMITED: 503,
  PROVIDER_UNAVAILABLE: 502,
  PROVIDER_BAD_REQUEST: 502,
  TIMEOUT: 504,
  CANCELLED: 499,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

const RETRYABLE: ReadonlySet<ApiErrorCode> = new Set([
  "RATE_LIMITED",
  "TOO_MANY_CONCURRENT",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "TIMEOUT",
  "CANCELLED",
  "INTERNAL_ERROR",
]);

/**
 * Marque globale : Next.js peut charger ce module dans plusieurs couches de bundle
 * (composants serveur, route handlers), ce qui rend `instanceof` peu fiable.
 */
const APP_ERROR_BRAND = Symbol.for("visionai.AppError");

/**
 * Erreur applicative dont le message est destiné à l'utilisateur final.
 * Le champ `cause` peut contenir l'erreur d'origine : il n'est jamais renvoyé au client.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
  readonly [APP_ERROR_BRAND] = true;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { cause?: unknown; retryAfterSeconds?: number } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.retryable = RETRYABLE.has(code);
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function isAppError(error: unknown): error is AppError {
  return typeof error === "object" && error !== null && (error as Record<symbol, unknown>)[APP_ERROR_BRAND] === true;
}

/** Convertit n'importe quelle erreur en réponse JSON sûre (aucune trace ni secret exposé). */
export function errorResponse(error: unknown): Response {
  const appError = isAppError(error)
    ? error
    : new AppError("INTERNAL_ERROR", "Une erreur inattendue est survenue. Veuillez réessayer.", { cause: error });

  if (appError.status >= 500 && appError.code !== "PROVIDER_NOT_CONFIGURED") {
    console.error(`[visionai] ${appError.code}:`, describeCause(appError));
  }

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      retryable: appError.retryable,
      ...(appError.retryAfterSeconds !== undefined && { retryAfterSeconds: appError.retryAfterSeconds }),
    },
  };
  const headers: HeadersInit = { "Cache-Control": "no-store" };
  if (appError.retryAfterSeconds !== undefined) {
    (headers as Record<string, string>)["Retry-After"] = String(appError.retryAfterSeconds);
  }
  return Response.json(body, { status: appError.status, headers });
}

/** Résumé loggable d'une erreur, sans dumper d'objets de requête pouvant contenir des en-têtes. */
function describeCause(error: AppError): string {
  const cause = error.cause;
  if (cause instanceof Error) return `${cause.name}: ${cause.message}`;
  if (cause !== undefined) return String(cause);
  return error.message;
}
