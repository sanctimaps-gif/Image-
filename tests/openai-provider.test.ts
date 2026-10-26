import OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { mapOpenAIError, OpenAIImageProvider, parseResponse } from "@/lib/image-providers/openai";
import { fakePng } from "./support/fixtures";

function provider(overrides: Partial<ConstructorParameters<typeof OpenAIImageProvider>[0]> = {}) {
  return new OpenAIImageProvider({
    apiKey: "sk-test-not-a-real-key",
    enabledModels: "gpt-image-2,gpt-image-1.5",
    defaultModel: "gpt-image-1.5",
    timeoutMs: 30_000,
    maxImagesPerRequest: 4,
    ...overrides,
  });
}

const baseRequest = {
  model: "gpt-image-1.5",
  prompt: "Un phare",
  size: "1024x1024",
  count: 1,
  quality: "high" as const,
  background: "auto" as const,
  outputFormat: "png" as const,
  outputCompression: null,
  safetyIdentifier: "hash",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OpenAIImageProvider", () => {
  it("expose uniquement les modèles reconnus, sans champ interne", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const p = provider({ enabledModels: "gpt-image-2,gpt-image-1.5,unknown-model" });
    expect(p.listModels().map((m) => m.id)).toEqual(["gpt-image-2", "gpt-image-1.5"]);
    expect(p.listModels()[0]).not.toHaveProperty("editInputFidelity");
    expect(p.listModels()[0]!.maxImages).toBe(4);
    expect(p.defaultModel()).toBe("gpt-image-1.5");
  });

  it("n'est pas configuré sans clé et refuse de générer", async () => {
    const p = provider({ apiKey: "" });
    expect(p.isConfigured()).toBe(false);
    await expect(p.generate(baseRequest)).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
  });

  it("appelle réellement /images/generations avec les paramètres validés", async () => {
    const b64 = fakePng().toString("base64");
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ created: 1, data: [{ b64_json: b64 }], output_format: "png", size: "1024x1024" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await provider().generate({ ...baseRequest, outputFormat: "webp", outputCompression: 80 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api.openai.com/v1/images/generations");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer sk-test-not-a-real-key");
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "gpt-image-1.5",
      prompt: "Un phare",
      n: 1,
      size: "1024x1024",
      quality: "high",
      background: "auto",
      output_format: "webp",
      output_compression: 80,
      moderation: "auto",
      safety_identifier: "hash",
    });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]!.data.equals(fakePng())).toBe(true);
    expect(result.size).toBe("1024x1024");
  });

  it("envoie une variante via /images/edits en multipart", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({ created: 1, data: [{ b64_json: fakePng().toString("base64") }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await provider().edit({
      ...baseRequest,
      sourceImage: { data: fakePng(), mimeType: "image/png", filename: "source.png" },
    });

    // Le SDK peut effectuer une sonde « data:, » pour tester la prise en charge de FormData.
    const call = fetchMock.mock.calls.find(([u]) => String(u).startsWith("https://"));
    const [url, init] = call!;
    expect(String(url)).toBe("https://api.openai.com/v1/images/edits");
    const form = init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("model")).toBe("gpt-image-1.5");
    expect(form.get("input_fidelity")).toBe("high");
    expect(form.get("image")).toBeInstanceOf(Blob);
  });
});

describe("parseResponse", () => {
  it("échoue si aucune image n'est renvoyée (jamais de faux succès)", () => {
    expect(() => parseResponse({ created: 1, data: [] }, "png")).toThrow(AppError);
    expect(() => parseResponse({ created: 1, data: [{ url: "https://x" }] }, "png")).toThrow(AppError);
  });
});

describe("mapOpenAIError", () => {
  const apiError = (status: number, code: string | null, message = "error") =>
    OpenAI.APIError.generate(status, { error: { message, code, type: "invalid_request_error" } }, message, new Headers());

  it.each([
    [apiError(400, "moderation_blocked"), "CONTENT_POLICY"],
    [apiError(400, null, "Your request was rejected by the safety system"), "CONTENT_POLICY"],
    [apiError(400, "invalid_value"), "PROVIDER_BAD_REQUEST"],
    [apiError(401, "invalid_api_key"), "PROVIDER_AUTH"],
    [apiError(403, null), "PROVIDER_PERMISSION"],
    [apiError(429, "insufficient_quota"), "PROVIDER_QUOTA"],
    [apiError(429, "rate_limit_exceeded"), "PROVIDER_RATE_LIMITED"],
    [apiError(500, null), "PROVIDER_UNAVAILABLE"],
    [new OpenAI.APIConnectionTimeoutError(), "TIMEOUT"],
    [new OpenAI.APIConnectionError({ message: "down" }), "PROVIDER_UNAVAILABLE"],
    [new OpenAI.APIUserAbortError(), "CANCELLED"],
    [new Error("boom"), "INTERNAL_ERROR"],
  ])("traduit %s", (error, code) => {
    const mapped = mapOpenAIError(error);
    expect(mapped.code).toBe(code);
    expect(mapped.message).not.toContain("sk-");
  });
});
