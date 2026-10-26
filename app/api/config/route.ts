import { errorResponse } from "@/lib/errors";
import { getGenerationService } from "@/lib/server-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Capacités publiques des fournisseurs (aucun secret : seulement l'état « configuré » et les options). */
export async function GET(): Promise<Response> {
  try {
    return Response.json(getGenerationService().getConfig(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
