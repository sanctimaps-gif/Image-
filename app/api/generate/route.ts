import { getServerEnv } from "@/lib/env";
import { errorResponse } from "@/lib/errors";
import { assertSameOrigin, getClientIp, readJsonBody } from "@/lib/http";
import { getOwnerId } from "@/lib/owner";
import { getGenerationService } from "@/lib/server-context";
import type { GenerateResponse } from "@/types/generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Une génération haute qualité peut prendre plus d'une minute.
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    const ownerId = (await getOwnerId({ create: true }))!;
    const generation = await getGenerationService().generate({
      body,
      ownerId,
      clientIp: getClientIp(request, getServerEnv().TRUST_PROXY_HEADERS),
      signal: request.signal,
    });
    const payload: GenerateResponse = { generation };
    return Response.json(payload, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
