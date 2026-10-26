import { describe, expect, it } from "vitest";
import { coerceSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { publicModel } from "./support/fixtures";

describe("coerceSettings", () => {
  const base = { ...DEFAULT_SETTINGS, model: "gpt-image-2" };

  it("remplace un format non pris en charge par le modèle", () => {
    const result = coerceSettings({ ...base, aspect: "widescreen" }, publicModel("gpt-image-1.5"), 4);
    expect(result.aspect).toBe("square");
    expect(result.model).toBe("gpt-image-1.5");
  });

  it("conserve le 16:9 sur gpt-image-2", () => {
    expect(coerceSettings({ ...base, aspect: "widescreen" }, publicModel("gpt-image-2"), 4).aspect).toBe("widescreen");
  });

  it("désactive la transparence si le modèle ne la gère pas", () => {
    expect(coerceSettings({ ...base, background: "transparent" }, publicModel("gpt-image-2"), 4).background).toBe("auto");
  });

  it("force PNG quand la transparence est demandée en JPEG", () => {
    const result = coerceSettings({ ...base, background: "transparent", outputFormat: "jpeg" }, publicModel("gpt-image-1.5"), 4);
    expect(result.outputFormat).toBe("png");
  });

  it("borne le nombre d'images", () => {
    expect(coerceSettings({ ...base, count: 9 }, publicModel("gpt-image-2"), 3).count).toBe(3);
    expect(coerceSettings({ ...base, count: 0 }, publicModel("gpt-image-2"), 3).count).toBe(1);
  });
});
