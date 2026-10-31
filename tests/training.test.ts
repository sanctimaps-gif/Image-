import { describe, expect, it } from "vitest";
import { ALL_EXERCISES, CURRICULUM } from "@/lib/training/curriculum";
import { analyzePixels, kMeans, toHex } from "@/lib/training/image-analysis";
import {
  enhanceComparison,
  moduleProgress,
  overallProgress,
  suggestedPromptScore,
  total,
  type Evaluation,
} from "@/lib/training/scoring";

const scores = (n: number) => ({ prompt: n, composition: n, realism: n, colors: n, details: n });
const evaluation = (exerciseId: string, n: number, createdAt: string, enhance = true): Evaluation => ({
  exerciseId,
  generationId: `${exerciseId}-${createdAt}`,
  scores: scores(n),
  present: [],
  enhance,
  createdAt,
});

describe("programme", () => {
  it("compte 8 modules et 40 exercices aux identifiants uniques", () => {
    expect(CURRICULUM).toHaveLength(8);
    expect(ALL_EXERCISES).toHaveLength(40);
    expect(new Set(ALL_EXERCISES.map((e) => e.id)).size).toBe(40);
    for (const e of ALL_EXERCISES) expect(e.expected.length).toBeGreaterThan(0);
  });
});

describe("notation", () => {
  it("additionne 5 critères sur 20 en bornant les valeurs", () => {
    expect(total(scores(20))).toBe(100);
    expect(total({ ...scores(10), prompt: 99, details: -5 })).toBe(50);
  });

  it("calcule le respect du prompt à partir des éléments présents", () => {
    expect(suggestedPromptScore([true, true, false, false])).toBe(10);
    expect(suggestedPromptScore([true, true, true])).toBe(20);
    expect(suggestedPromptScore([])).toBe(0);
  });

  it("suit la progression avec la note la plus récente de chaque exercice", () => {
    const list = [
      evaluation("m1-sujet", 10, "2026-01-01T00:00:00Z"),
      evaluation("m1-sujet", 16, "2026-01-02T00:00:00Z"),
      evaluation("m1-couleurs", 12, "2026-01-01T00:00:00Z", false),
    ];
    const m1 = moduleProgress(list)[0]!;
    expect(m1).toEqual({ moduleId: "langage", rated: 2, count: 5, average: 70 });
    expect(overallProgress(list)).toBe(5);
    expect(enhanceComparison(list)).toEqual({ with: 65, without: 60, counts: [2, 1] });
  });
});

describe("analyse des pixels", () => {
  it("mesure dimensions, couleur moyenne et couleurs dominantes", () => {
    // Image 4×2 : moitié rouge, moitié bleue.
    const data = new Uint8ClampedArray(4 * 2 * 4);
    for (let i = 0; i < 8; i++) data.set(i % 4 < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255], i * 4);
    const a = analyzePixels(data, 4, 2, 2);
    expect(a).toMatchObject({ width: 4, height: 2, pixels: 8, rawBytes: 24, firstPixel: [255, 0, 0], mean: [128, 0, 128] });
    expect(a.dominant.map((d) => [toHex(d.rgb), d.share])).toEqual(
      expect.arrayContaining([
        ["#ff0000", 0.5],
        ["#0000ff", 0.5],
      ]),
    );
  });

  it("regroupe des couleurs proches", () => {
    const result = kMeans([[250, 250, 250], [255, 255, 255], [0, 0, 10], [5, 0, 0]], 2);
    expect(result).toHaveLength(2);
    expect(result.every((d) => d.share === 0.5)).toBe(true);
  });
});
