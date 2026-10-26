import { AppError, errorResponse } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/http";
import { getOwnerId } from "@/lib/owner";
import { getGenerationService } from "@/lib/server-context";
import { uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, ctx: RouteContext<"/api/generations/[id]">): Promise<Response> {
  try {
    assertSameOrigin(request);
    const { id } = await ctx.params;
    const ownerId = await getOwnerId({ create: false });
    if (!uuidSchema.safeParse(id).success || !ownerId) throw notFound();
    const deleted = await getGenerationService().store.deleteGeneration(ownerId, id);
    if (!deleted) throw notFound();
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

function notFound() {
  return new AppError("NOT_FOUND", "Cette création est introuvable.");
}
