import { describe, expect, it, vi } from "vitest";
import { PollinationsImageProvider } from "@/lib/image-providers/pollinations";
import { fakePng } from "./support/fixtures";

const request = {
  model: "flux",
  prompt: "Un phare breton",
  size: "1024x576",
  count: 1,
  quality: "auto" as const,
  background: "auto" as const,
  outputFormat: "jpeg" as const,
  outputCompression: null,
  safetyIdentifier: "x",
};

describe("PollinationsImageProvider", () => {
  it("demande l'image avec la taille choisie et renvoie ses octets", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(new Uint8Array(fakePng()), { headers: { "content-type": "image/png" } }));
    const result = await new PollinationsImageProvider(fetchMock).generate(request);
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.origin + decodeURIComponent(url.pathname)).toBe("https://image.pollinations.ai/prompt/Un phare breton");
    expect(url.searchParams.get("width")).toBe("1024");
    expect(url.searchParams.get("height")).toBe("576");
    expect(Buffer.from(result.images[0]!.data).equals(fakePng())).toBe(true);
  });

  it.each([
    [429, "PROVIDER_RATE_LIMITED"],
    [402, "PROVIDER_PERMISSION"],
    [500, "PROVIDER_UNAVAILABLE"],
  ])("traduit le statut %s", async (status, code) => {
    const provider = new PollinationsImageProvider(async () => new Response("nope", { status }));
    await expect(provider.generate(request)).rejects.toMatchObject({ code });
  });

  it("signale un service injoignable", async () => {
    const provider = new PollinationsImageProvider(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(provider.generate(request)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});
