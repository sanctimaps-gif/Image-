import { describe, expect, it } from "vitest";
import { appendDetail, isShortPrompt, proposeVariations } from "@/lib/prompt-expansion";

describe("enrichissement des descriptions courtes", () => {
  it("détecte une description courte", () => {
    expect(isShortPrompt("Un château fort")).toBe(true);
    expect(isShortPrompt("   ")).toBe(false);
    expect(isShortPrompt("Un château fort médiéval sur une île rocheuse au coucher du soleil")).toBe(false);
  });

  it("propose quatre déclinaisons complètes qui gardent le sujet", () => {
    const variations = proposeVariations("Un château fort.");
    expect(variations).toHaveLength(4);
    for (const v of variations) expect(v.prompt.startsWith("Un château fort, ")).toBe(true);
    expect(variations[0]!.prompt).toContain("petits personnages pour donner l'échelle");
  });

  it("ajoute une précision sans doublon", () => {
    expect(appendDetail("Un chat", "vue aérienne")).toBe("Un chat, vue aérienne");
    expect(appendDetail("Un chat, vue aérienne", "vue aérienne")).toBe("Un chat, vue aérienne");
    expect(appendDetail("", "gros plan")).toBe("gros plan");
  });
});
