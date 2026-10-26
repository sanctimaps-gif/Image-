import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { uuidSchema } from "@/lib/validation";

/**
 * Identifiant anonyme du navigateur, stocké dans un cookie httpOnly.
 * Il cloisonne l'historique en attendant un véritable système de comptes :
 * il suffira alors de remplacer cette fonction par l'identifiant de l'utilisateur connecté.
 */
const COOKIE_NAME = "visionai_client";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getOwnerId(options: { create: boolean }): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing && uuidSchema.safeParse(existing).success) return existing;
  if (!options.create) return null;

  const id = randomUUID();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return id;
}

/** Identifiant haché transmis au fournisseur (`safety_identifier`), sans donnée personnelle. */
export function hashOwnerId(ownerId: string): string {
  return createHash("sha256").update(`visionai:${ownerId}`).digest("hex").slice(0, 48);
}
