import { AppError, errorResponse } from "@/lib/errors";
import { getOwnerId } from "@/lib/owner";
import { getGenerationService } from "@/lib/server-context";
import { uuidSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Sert une image générée, uniquement au navigateur qui l'a créée. `?download=1` force le téléchargement. */
export async function GET(request: Request, ctx: RouteContext<"/api/images/[id]">): Promise<Response> {
  try {
    const { id } = await ctx.params;
    const ownerId = await getOwnerId({ create: false });
    if (!ownerId || !uuidSchema.safeParse(id).success) throw notFound();
    const file = await getGenerationService().store.readImage(ownerId, id);
    if (!file) throw notFound();

    const download = new URL(request.url).searchParams.get("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.data.length),
      // Contenu immuable mais privé : jamais mis en cache par un proxy partagé.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="visionai-${id.slice(0, 8)}.${EXT[file.mimeType] ?? "png"}"`;
    }
    return new Response(new Uint8Array(file.data), { headers });
  } catch (error) {
    return errorResponse(error);
  }
}

function notFound() {
  return new AppError("NOT_FOUND", "Image introuvable.");
}
