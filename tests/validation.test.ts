import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { parseGenerateRequest, resolveGeneration } from "@/lib/validation";
import { FakeProvider } from "./support/fixtures";

function expectAppError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
    return error as AppError;
  }
  throw new Error("Une AppError était attendue");
}

describe("parseGenerateRequest", () => {
  it("applique les valeurs par défaut", () => {
    const req = parseGenerateRequest({ prompt: "  Un phare au crépuscule " });
    expect(req).toMatchObject({
      prompt: "Un phare au crépuscule",
      style: "none",
      aspect: "square",
      quality: "auto",
      background: "auto",
      outputFormat: "png",
      count: 1,
      sourceImageId: null,
    });
  });

  it("refuse un prompt vide ou trop court avec un message clair", () => {
    const error = expectAppError(() => parseGenerateRequest({ prompt: "   " }), "VALIDATION_ERROR");
    expect(error.message).toMatch(/quelques mots/);
  });

  it("refuse un prompt trop long", () => {
    expectAppError(() => parseGenerateRequest({ prompt: "a".repeat(4001) }), "VALIDATION_ERROR");
  });

  it("refuse les valeurs hors liste et les clés inconnues", () => {
    expectAppError(() => parseGenerateRequest({ prompt: "Un chat", style: "hacker" }), "VALIDATION_ERROR");
    expectAppError(() => parseGenerateRequest({ prompt: "Un chat", count: 50 }), "VALIDATION_ERROR");
    expectAppError(() => parseGenerateRequest({ prompt: "Un chat", apiKey: "sk-123" }), "VALIDATION_ERROR");
    expectAppError(() => parseGenerateRequest({ prompt: "Un chat", sourceImageId: "../../etc/passwd" }), "VALIDATION_ERROR");
    expectAppError(() => parseGenerateRequest("pas un objet"), "VALIDATION_ERROR");
  });
});

describe("resolveGeneration", () => {
  const providers = () => [new FakeProvider()];
  const req = (extra: Record<string, unknown> = {}) => parseGenerateRequest({ prompt: "Un chat sur la lune", ...extra });

  it("résout le modèle par défaut et la taille réelle du format", () => {
    const resolved = resolveGeneration(req({ aspect: "landscape" }), providers());
    expect(resolved.settings.model).toBe("gpt-image-1.5");
    expect(resolved.format.size).toBe("1536x1024");
    expect(resolved.settings.outputCompression).toBeNull();
  });

  it("propose le 16:9 uniquement sur gpt-image-2", () => {
    expect(resolveGeneration(req({ model: "gpt-image-2", aspect: "widescreen" }), providers()).format.size).toBe("1536x864");
    expectAppError(() => resolveGeneration(req({ model: "gpt-image-1.5", aspect: "widescreen" }), providers()), "UNSUPPORTED_OPTION");
  });

  it("refuse la transparence non prise en charge ou incompatible JPEG", () => {
    expectAppError(() => resolveGeneration(req({ model: "gpt-image-2", background: "transparent" }), providers()), "UNSUPPORTED_OPTION");
    expectAppError(
      () => resolveGeneration(req({ background: "transparent", outputFormat: "jpeg" }), providers()),
      "UNSUPPORTED_OPTION",
    );
    expect(resolveGeneration(req({ background: "transparent", outputFormat: "webp" }), providers()).settings.background).toBe(
      "transparent",
    );
  });

  it("refuse un modèle inconnu et un nombre d'images au-delà du plafond", () => {
    expectAppError(() => resolveGeneration(req({ model: "dall-e-9" }), providers()), "UNSUPPORTED_OPTION");
    expectAppError(() => resolveGeneration(req({ count: 5 }), providers()), "UNSUPPORTED_OPTION");
  });

  it("signale un fournisseur non configuré", () => {
    const provider = new FakeProvider();
    provider.configured = false;
    expectAppError(() => resolveGeneration(req(), [provider]), "PROVIDER_NOT_CONFIGURED");
  });

  it("conserve la compression pour jpeg/webp", () => {
    expect(resolveGeneration(req({ outputFormat: "jpeg", outputCompression: 70 }), providers()).settings.outputCompression).toBe(70);
  });
});

describe("isAppError", () => {
  it("reconnaît une AppError même issue d'une autre copie du module", async () => {
    const { isAppError } = await import("@/lib/errors");
    const foreign = { [Symbol.for("visionai.AppError")]: true, code: "NOT_FOUND" };
    expect(isAppError(new AppError("NOT_FOUND", "x"))).toBe(true);
    expect(isAppError(foreign)).toBe(true);
    expect(isAppError(new Error("x"))).toBe(false);
  });
});
