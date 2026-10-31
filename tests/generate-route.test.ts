import { promises as fs } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { GenerationService, type GenerationLimits } from "@/lib/generation-service";
import { FileGenerationStore } from "@/lib/storage/file-store";
import type { ApiErrorBody, GenerateResponse, HistoryResponse } from "@/types/generation";
import { FakeProvider, fakePng, makeTempDir } from "./support/fixtures";

// ── Doublures : cookies de Next.js et service applicatif ─────────────────────
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
  }),
}));

const context: { service: GenerationService | null } = { service: null };
vi.mock("@/lib/server-context", () => ({ getGenerationService: () => context.service! }));

const { POST } = await import("@/app/api/generate/route");
const { GET: listHistory } = await import("@/app/api/generations/route");
const { DELETE: deleteGeneration } = await import("@/app/api/generations/[id]/route");
const { GET: getImage } = await import("@/app/api/images/[id]/route");

const DEFAULT_LIMITS: GenerationLimits = {
  requestsPerMinute: 10,
  imagesPerDay: 20,
  globalImagesPerDay: 100,
  maxImagesPerRequest: 4,
  maxConcurrentPerClient: 2,
};

let provider: FakeProvider;
let dir: string;

function setup(limits: Partial<GenerationLimits> = {}) {
  context.service = new GenerationService({
    providers: [provider],
    store: new FileGenerationStore(dir, 50),
    limits: { ...DEFAULT_LIMITS, ...limits },
    hashOwnerId: (id) => `hash-${id}`,
  });
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost:3000", origin: "http://localhost:3000", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(async () => {
  cookieJar.clear();
  provider = new FakeProvider();
  dir = await makeTempDir();
  setup();
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("POST /api/generate", () => {
  it("génère, stocke et renvoie la création avec un identifiant unique", async () => {
    const res = await post({ prompt: "Un château futuriste", style: "cinematic", aspect: "landscape", count: 2 });
    expect(res.status).toBe(201);
    const { generation } = (await res.json()) as GenerateResponse;

    expect(generation.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(generation.kind).toBe("text-to-image");
    expect(generation.images).toHaveLength(2);
    expect(new Set(generation.images.map((i) => i.id)).size).toBe(2);
    expect(generation.images[0]!.url).toBe(`/api/images/${generation.images[0]!.id}`);
    expect(generation.settings).toMatchObject({ model: "gpt-image-1.5", style: "cinematic", aspect: "landscape" });

    const call = provider.generateCalls[0]!;
    expect(call.size).toBe("1536x1024");
    expect(call.count).toBe(2);
    expect(call.prompt).toContain("Un château futuriste");
    expect(call.prompt).toContain("Cinematic film still");
    expect(call.safetyIdentifier).toMatch(/^hash-/);
    expect(cookieJar.get("visionai_client")).toMatch(/^[0-9a-f-]{36}$/);

    // L'image est servie au même navigateur…
    const img = await getImage(new Request(`http://localhost:3000${generation.images[0]!.url}`), params(generation.images[0]!.id));
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await img.arrayBuffer()).equals(fakePng())).toBe(true);

    const download = await getImage(
      new Request(`http://localhost:3000${generation.images[0]!.url}?download=1`),
      params(generation.images[0]!.id),
    );
    expect(download.headers.get("content-disposition")).toMatch(/^attachment; filename="visionai-/);

    // …et apparaît dans son historique.
    const history = (await (await listHistory()).json()) as HistoryResponse;
    expect(history.generations.map((g) => g.id)).toEqual([generation.id]);

    // Un autre navigateur n'y a pas accès.
    cookieJar.clear();
    const other = await getImage(new Request(`http://localhost:3000${generation.images[0]!.url}`), params(generation.images[0]!.id));
    expect(other.status).toBe(404);
    expect(((await (await listHistory()).json()) as HistoryResponse).generations).toEqual([]);
  });

  it("construit le prompt d'un modèle créatif et conserve ses champs", async () => {
    const res = await post({
      prompt: "La cathédrale de Rouen au coucher du soleil",
      model: "gpt-image-2",
      template: "poster",
      templateFields: { title: "ROUEN", tagline: "Une ville, une histoire" },
      aspect: "story",
      resolution: "hd",
    });
    expect(res.status).toBe(201);
    const { generation } = (await res.json()) as GenerateResponse;
    expect(generation.templateFields).toEqual({ title: "ROUEN", tagline: "Une ville, une histoire" });
    expect(generation.settings).toMatchObject({ template: "poster", aspect: "story", resolution: "hd" });
    expect(generation.prompt).toBe("La cathédrale de Rouen au coucher du soleil");
    const call = provider.generateCalls[0]!;
    expect(call.size).toBe("1440x2560");
    expect(call.prompt).toContain('"ROUEN"');
    expect(call.prompt).toContain("cinematic illustrated poster");
  });

  it("valide le prompt côté serveur", async () => {
    const res = await post({ prompt: "" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorBody;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(provider.generateCalls).toHaveLength(0);
  });

  it("refuse un format non pris en charge par le modèle", async () => {
    const res = await post({ prompt: "Un paysage", model: "gpt-image-1.5", aspect: "widescreen" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("UNSUPPORTED_OPTION");
  });

  it("refuse les requêtes d'une autre origine (CSRF)", async () => {
    const res = await post({ prompt: "Un chat" }, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(provider.generateCalls).toHaveLength(0);
  });

  it("refuse un corps trop volumineux ou non JSON", async () => {
    expect((await post({ prompt: "x".repeat(20_000) })).status).toBe(413);
    expect((await post("{pas du json", {})).status).toBe(400);
    expect((await post({ prompt: "Un chat" }, { "content-type": "text/plain" })).status).toBe(400);
  });

  it("indique clairement l'absence de configuration", async () => {
    provider.configured = false;
    const res = await post({ prompt: "Un chat" });
    expect(res.status).toBe(503);
    const body = (await res.json()) as ApiErrorBody;
    expect(body.error.code).toBe("PROVIDER_NOT_CONFIGURED");
    expect(body.error.message).toMatch(/clé API/);
  });

  it("limite le nombre de requêtes par minute", async () => {
    setup({ requestsPerMinute: 2 });
    expect((await post({ prompt: "Un chat" })).status).toBe(201);
    expect((await post({ prompt: "Un chat" })).status).toBe(201);
    const res = await post({ prompt: "Un chat" });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("applique le quota quotidien d'images et rembourse les échecs du fournisseur", async () => {
    setup({ imagesPerDay: 3 });
    provider.nextResult = async () => {
      throw new AppError("PROVIDER_UNAVAILABLE", "Indisponible");
    };
    expect((await post({ prompt: "Un chat", count: 3 })).status).toBe(502);

    provider.nextResult = new FakeProvider().nextResult;
    expect((await post({ prompt: "Un chat", count: 3 })).status).toBe(201);
    const res = await post({ prompt: "Un chat" });
    expect(res.status).toBe(429);
    expect(((await res.json()) as ApiErrorBody).error.message).toMatch(/Limite quotidienne/);
  });

  it("n'expose pas les détails internes d'une erreur inattendue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    provider.nextResult = async () => {
      throw new Error("ECONNRESET at 10.0.0.1 with key sk-secret");
    };
    const res = await post({ prompt: "Un chat" });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("sk-secret");
    expect(text).not.toContain("10.0.0.1");
  });

  it("rejette une réponse du fournisseur qui n'est pas une image", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    provider.nextResult = async () => ({ images: [{ data: Buffer.from("<html>"), mimeType: "image/png" }], size: null });
    const res = await post({ prompt: "Un chat" });
    expect(res.status).toBe(502);
    expect(((await (await listHistory()).json()) as HistoryResponse).generations).toEqual([]);
  });

  it("crée une variante à partir d'une image de l'historique uniquement", async () => {
    const first = ((await (await post({ prompt: "Un phare" })).json()) as GenerateResponse).generation;
    const res = await post({ prompt: "Un phare sous la neige", sourceImageId: first.images[0]!.id });
    expect(res.status).toBe(201);
    const { generation } = (await res.json()) as GenerateResponse;
    expect(generation.kind).toBe("variation");
    expect(generation.sourceImageId).toBe(first.images[0]!.id);
    expect(provider.editCalls).toHaveLength(1);
    expect(Buffer.from(provider.editCalls[0]!.sourceImage.data).equals(fakePng())).toBe(true);

    const unknown = await post({ prompt: "Un phare", sourceImageId: "00000000-0000-4000-8000-000000000000" });
    expect(unknown.status).toBe(404);
  });
});

describe("DELETE /api/generations/[id]", () => {
  it("supprime la création et ses fichiers", async () => {
    const { generation } = (await (await post({ prompt: "Un phare" })).json()) as GenerateResponse;
    const del = (id: string, origin = "http://localhost:3000") =>
      deleteGeneration(
        new Request(`http://localhost:3000/api/generations/${id}`, { method: "DELETE", headers: { host: "localhost:3000", origin } }),
        params(id),
      );

    expect((await del(generation.id, "https://evil.example")).status).toBe(403);
    expect((await del(generation.id)).status).toBe(204);
    expect((await del(generation.id)).status).toBe(404);
    const img = await getImage(new Request("http://localhost:3000/x"), params(generation.images[0]!.id));
    expect(img.status).toBe(404);
  });
});
