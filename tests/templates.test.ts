import { describe, expect, it } from "vitest";
import { buildPrompt } from "@/lib/prompt";
import { applyTemplateDefaults, DEFAULT_SETTINGS } from "@/lib/settings";
import { buildTemplatePrompt, cleanTemplateFields, getTemplate, validateTemplateFields } from "@/lib/templates";
import { parseGenerateRequest, resolveGeneration } from "@/lib/validation";
import { FakeProvider, publicModel } from "./support/fixtures";

describe("modèles créatifs", () => {
  it("affiche : cite exactement titre, sous-titre et slogan", () => {
    const prompt = buildTemplatePrompt("poster", "La cathédrale de Rouen", {
      title: "ROUEN",
      subtitle: "Capitale de la Normandie",
      tagline: 'Une ville, une "histoire"',
      palette: "tricolore",
    });
    expect(prompt).toContain('"ROUEN"');
    expect(prompt).toContain('"Capitale de la Normandie"');
    expect(prompt).toContain(`"Une ville, une 'histoire'"`);
    expect(prompt).toContain("La cathédrale de Rouen");
    expect(prompt).toContain("French tricolour flag");
  });

  it("fiche personnage : 5 vues, 6 détails et les scènes d'action demandées", () => {
    const prompt = buildTemplatePrompt("character-sheet", "Joueur de water-polo", { actions: "Tir\nDéfense\n\nPasse" });
    expect(prompt).toContain('"VUE DE FACE"');
    expect(prompt).toContain('"VUE 3/4 AVANT"');
    expect(prompt).toContain('"GROS PLAN VISAGE (FACE)"');
    expect(prompt).toContain('Row 3 — 3 dynamic action shots: "EN ACTION (TIR)", "EN ACTION (DÉFENSE)", "EN ACTION (PASSE)"');
    expect(prompt).toContain("strictly identical in every panel");
  });

  it("infographie : étapes numérotées et points clés", () => {
    const prompt = buildTemplatePrompt("infographic", "Le crawl polo", {
      title: "CRAWL POLO",
      steps: "Entrée de la main\nTraction",
      keyPoints: "Tête haute",
    });
    expect(prompt).toContain('1. "ENTRÉE DE LA MAIN"');
    expect(prompt).toContain('2. "TRACTION"');
    expect(prompt).toContain('"POINTS CLÉS"');
    expect(prompt).toContain('"TÊTE HAUTE"');
  });

  it("le style s'ajoute après le modèle créatif ; sans modèle le prompt reste brut", () => {
    expect(buildPrompt("Un phare", "none")).toBe("Un phare");
    const prompt = buildPrompt("Un athlète", "cinematic", "sport-photo", {});
    expect(prompt.startsWith("Editorial sports photography")).toBe(true);
    expect(prompt).toContain("Style: Cinematic film still");
  });

  it("valide les champs : requis, longueur, options, clés inconnues", () => {
    expect(validateTemplateFields("poster", {})).toMatch(/Titre/);
    expect(validateTemplateFields("poster", { title: "x".repeat(41) })).toMatch(/dépasse/);
    expect(validateTemplateFields("poster", { title: "A", palette: "fluo" })).toMatch(/invalide/);
    expect(validateTemplateFields("none", { title: "A" })).toMatch(/inconnu/);
    expect(validateTemplateFields("poster", { title: "ROUEN", palette: "or-nuit" })).toBeNull();
    expect(cleanTemplateFields("poster", { title: "  ROUEN ", subtitle: " " })).toEqual({ title: "ROUEN" });
  });

  it("la requête serveur refuse un modèle créatif incomplet", () => {
    expect(() => parseGenerateRequest({ prompt: "Une affiche", template: "poster" })).toThrow(/Titre/);
    const req = parseGenerateRequest({ prompt: "Une affiche", template: "poster", templateFields: { title: " ROUEN " } });
    expect(req.templateFields).toEqual({ title: "ROUEN" });
  });

  it("applique les réglages conseillés : gpt-image-2, 9:16 HD, haute qualité pour une affiche", () => {
    const models = [publicModel("gpt-image-1.5"), publicModel("gpt-image-2")];
    const next = applyTemplateDefaults({ ...DEFAULT_SETTINGS, model: "gpt-image-1.5" }, getTemplate("poster"), models, 4);
    expect(next).toMatchObject({ template: "poster", model: "gpt-image-2", aspect: "story", resolution: "hd", quality: "high", count: 1 });

    const without2 = applyTemplateDefaults({ ...DEFAULT_SETTINGS, model: "gpt-image-1.5" }, getTemplate("poster"), [models[0]!], 4);
    expect(without2).toMatchObject({ model: "gpt-image-1.5", aspect: "portrait", resolution: "standard" });
  });
});

describe("haute définition", () => {
  const providers = () => [new FakeProvider()];

  it("envoie la taille HD de gpt-image-2", () => {
    const req = parseGenerateRequest({ prompt: "Une affiche", model: "gpt-image-2", aspect: "story", resolution: "hd" });
    const resolved = resolveGeneration(req, providers());
    expect(resolved.size.size).toBe("1440x2560");
    expect(resolved.settings.resolution).toBe("hd");
  });

  it("refuse la HD sur un modèle à tailles fixes", () => {
    const req = parseGenerateRequest({ prompt: "Une affiche", model: "gpt-image-1.5", resolution: "hd" });
    expect(() => resolveGeneration(req, providers())).toThrow(/haute définition/);
  });

  it("toutes les tailles gpt-image-2 respectent les contraintes documentées", () => {
    for (const format of publicModel("gpt-image-2").formats) {
      for (const dims of [format, format.hd!]) {
        expect(dims.width % 16).toBe(0);
        expect(dims.height % 16).toBe(0);
        expect(dims.width * dims.height).toBeLessThanOrEqual(2560 * 1440);
        expect(Math.max(dims.width, dims.height) / Math.min(dims.width, dims.height)).toBeLessThanOrEqual(3);
      }
    }
  });
});
