import { describe, expect, it } from "vitest";
import { buildPrompt, normalizePrompt } from "@/lib/prompt";

describe("normalizePrompt", () => {
  it("supprime les caractères de contrôle et les espaces superflus", () => {
    expect(normalizePrompt("  Un\u0000 chat   roux \t\n\n\n\nsur un toit  ")).toBe("Un chat roux \n\nsur un toit");
  });
});

describe("buildPrompt", () => {
  it("n'ajoute rien sans style", () => {
    expect(buildPrompt("Un phare breton", "none")).toBe("Un phare breton");
  });

  it("ajoute la description du style choisi", () => {
    const prompt = buildPrompt("Un phare breton", "watercolor");
    expect(prompt.startsWith("Un phare breton\n\nStyle: ")).toBe(true);
    expect(prompt).toContain("Watercolor painting");
  });
});
