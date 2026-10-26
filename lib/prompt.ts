import { getStyle } from "@/lib/catalog";
import { buildTemplatePrompt } from "@/lib/templates";
import type { StyleId, TemplateFields, TemplateId } from "@/types/generation";

/** Assemble le prompt final envoyé au fournisseur : texte saisi, modèle créatif, puis style. */
export function buildPrompt(
  userPrompt: string,
  style: StyleId,
  template: TemplateId = "none",
  fields: TemplateFields = {},
): string {
  const base = buildTemplatePrompt(template, normalizePrompt(userPrompt), fields);
  const suffix = getStyle(style).promptSuffix;
  return suffix ? `${base}\n\nStyle: ${suffix}` : base;
}

/** Supprime les caractères de contrôle et normalise les espaces sans altérer les sauts de ligne utiles. */
export function normalizePrompt(prompt: string): string {
  return prompt
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
