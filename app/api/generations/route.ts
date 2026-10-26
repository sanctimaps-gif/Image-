import { errorResponse } from "@/lib/errors";
import { getOwnerId } from "@/lib/owner";
import { getGenerationService } from "@/lib/server-context";
import type { HistoryResponse } from "@/types/generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const ownerId = await getOwnerId({ create: false });
    const generations = ownerId ? await getGenerationService().store.listGenerations(ownerId) : [];
    const payload: HistoryResponse = { generations };
    return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
