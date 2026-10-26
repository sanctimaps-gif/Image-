import type { AspectId, Quality, TemplateFields, TemplateId } from "@/types/generation";

/**
 * Modèles créatifs : ils transforment une description courte et quelques champs
 * (titre, slogan, étapes…) en un prompt détaillé, structuré pour les rendus de type
 * affiche, fiche personnage, infographie ou photo sportive.
 * Partagé client/serveur : le serveur reconstruit toujours le prompt lui-même.
 */

export interface TemplateFieldOption {
  value: string;
  label: string;
}

export interface TemplateField {
  key: string;
  label: string;
  placeholder?: string;
  maxLength: number;
  multiline?: boolean;
  required?: boolean;
  /** Si présent, la valeur doit être l'une de ces options. */
  options?: TemplateFieldOption[];
}

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  description: string;
  /** Texte d'aide de la zone de description principale. */
  subjectPlaceholder: string;
  fields: TemplateField[];
  /** Réglages conseillés, appliqués quand l'utilisateur choisit le modèle. */
  recommended: { aspects: AspectId[]; quality: Quality; preferHd: boolean };
}

const PALETTES: TemplateFieldOption[] = [
  { value: "tricolore", label: "Tricolore (bleu-blanc-rouge)" },
  { value: "or-nuit", label: "Or et bleu nuit" },
  { value: "coucher-soleil", label: "Coucher de soleil" },
  { value: "naturelle", label: "Couleurs naturelles" },
];

const PALETTE_PROMPTS: Record<string, string> = {
  tricolore:
    "a large French tricolour flag (deep blue, white, vivid red) waving softly in the background and blending into a dramatic sky, accents in blue, white and red",
  "or-nuit": "a deep midnight-blue palette with glowing golden light, gold particles and luminous golden lines",
  "coucher-soleil": "a warm golden-hour sunset palette, orange and pink sky, long soft shadows",
  naturelle: "natural, true-to-life colours",
};

export const TEMPLATES: readonly TemplateDefinition[] = [
  {
    id: "none",
    label: "Libre",
    description: "Votre description telle quelle.",
    subjectPlaceholder:
      "Un château futuriste au sommet d'une montagne, au coucher du soleil, photographie cinématographique ultra détaillée.",
    fields: [],
    recommended: { aspects: ["square"], quality: "auto", preferHd: false },
  },
  {
    id: "poster",
    label: "Affiche épique",
    description: "Affiche cinématographique avec titre, sous-titre et slogan.",
    subjectPlaceholder:
      "La cathédrale de Rouen au coucher du soleil, reflets sur la Seine, Jeanne d'Arc en statue de pierre qui se fond dans le ciel.",
    fields: [
      { key: "title", label: "Titre", placeholder: "ROUEN", maxLength: 40, required: true },
      { key: "subtitle", label: "Sous-titre", placeholder: "Capitale de la Normandie", maxLength: 80 },
      { key: "tagline", label: "Slogan", placeholder: "Une ville, une histoire, une France", maxLength: 80 },
      { key: "palette", label: "Ambiance", maxLength: 20, options: PALETTES },
    ],
    recommended: { aspects: ["story", "portrait"], quality: "high", preferHd: true },
  },
  {
    id: "character-sheet",
    label: "Fiche personnage",
    description: "Planche de référence : 5 vues, gros plans et scènes d'action.",
    subjectPlaceholder:
      "Joueur de water-polo de l'équipe de France, bonnet bleu marine n°9 avec protège-oreilles blancs, slip de bain bleu marine « FRANCE » à liseré tricolore, ballon jaune Mikasa.",
    fields: [
      {
        key: "setting",
        label: "Décor",
        placeholder: "Piscine olympique, gradins bleus",
        maxLength: 120,
      },
      {
        key: "actions",
        label: "Scènes d'action (une par ligne)",
        placeholder: "Tir\nDéfense\nPasse\nVue arrière\nÉmergence",
        maxLength: 300,
        multiline: true,
      },
    ],
    recommended: { aspects: ["square"], quality: "high", preferHd: true },
  },
  {
    id: "infographic",
    label: "Infographie",
    description: "Décomposition pédagogique en étapes illustrées.",
    subjectPlaceholder: "Le crawl polo, nage spécifique au water-polo, tête hors de l'eau.",
    fields: [
      { key: "title", label: "Titre", placeholder: "WATER POLO – CRAWL POLO", maxLength: 60, required: true },
      { key: "subtitle", label: "Sous-titre", placeholder: "Décomposition du mouvement", maxLength: 80 },
      {
        key: "steps",
        label: "Étapes (une par ligne)",
        placeholder: "Position de départ\nEntrée de la main\nPhase de traction\nSortie de l'eau\nRetour du bras\nRespiration et vision",
        maxLength: 500,
        multiline: true,
        required: true,
      },
      {
        key: "keyPoints",
        label: "Points clés (une par ligne)",
        placeholder: "Tête haute\nCoude haut\nMouvement continu",
        maxLength: 300,
        multiline: true,
      },
    ],
    recommended: { aspects: ["landscape", "widescreen"], quality: "high", preferHd: true },
  },
  {
    id: "sport-photo",
    label: "Photo sportive",
    description: "Portrait d'athlète façon photographie éditoriale.",
    subjectPlaceholder:
      "Joueur de football américain, maillot noir n°12 à bandes grises, casque noir avec logo de loup, ballon sous le bras.",
    fields: [
      { key: "setting", label: "Lieu", placeholder: "Stade de nuit sous les projecteurs, tribunes pleines", maxLength: 120 },
    ],
    recommended: { aspects: ["portrait"], quality: "high", preferHd: true },
  },
];

export function getTemplate(id: TemplateId): TemplateDefinition {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!;
}

/** Vérifie les champs d'un modèle. Renvoie un message d'erreur, ou null si tout est valide. */
export function validateTemplateFields(id: TemplateId, fields: TemplateFields): string | null {
  const template = getTemplate(id);
  const allowed = new Set(template.fields.map((f) => f.key));
  for (const key of Object.keys(fields)) {
    if (!allowed.has(key)) return `Champ inconnu pour le modèle « ${template.label} ».`;
  }
  for (const field of template.fields) {
    const value = (fields[field.key] ?? "").trim();
    if (field.required && !value) return `Le champ « ${field.label} » est requis.`;
    if (value.length > field.maxLength) return `Le champ « ${field.label} » dépasse ${field.maxLength} caractères.`;
    if (value && field.options && !field.options.some((o) => o.value === value)) {
      return `Valeur invalide pour « ${field.label} ».`;
    }
  }
  return null;
}

/** Ne conserve que les champs du modèle, nettoyés (le reste est ignoré). */
export function cleanTemplateFields(id: TemplateId, fields: TemplateFields): TemplateFields {
  const result: TemplateFields = {};
  for (const field of getTemplate(id).fields) {
    const value = (fields[field.key] ?? "").trim();
    if (value) result[field.key] = value;
  }
  return result;
}

const lines = (value: string | undefined, max: number) =>
  (value ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);

/** Le texte destiné à apparaître sur l'image est cité tel quel, guillemets neutralisés. */
const quote = (value: string) => `"${value.replace(/"/g, "'")}"`;

const TEXT_RULES =
  "Render every quoted text exactly as written, letter for letter, with correct French spelling and accents, crisp and perfectly legible. Do not add any other text, watermark or signature.";

/** Construit le prompt détaillé envoyé au modèle pour un modèle créatif. */
export function buildTemplatePrompt(id: TemplateId, subject: string, fields: TemplateFields): string {
  switch (id) {
    case "poster": {
      const palette = PALETTE_PROMPTS[fields.palette ?? "tricolore"] ?? PALETTE_PROMPTS.tricolore;
      return [
        "Design a premium, cinematic illustrated poster in the style of a high-end tourism or patriotic campaign.",
        `Main subject and scene: ${subject}`,
        `Visual treatment: ${palette}; epic sense of scale, dramatic clouds, volumetric god rays, golden-hour light, rich contrast, ultra-detailed photorealistic matte painting, layered depth with a strong focal point in the lower two thirds.`,
        "Typography at the top, centred, in an elegant high-contrast serif typeface with wide letter-spacing:",
        `- Large title in capitals: ${quote(fields.title ?? "")}`,
        fields.subtitle ? `- Subtitle in refined italic below the title: ${quote(fields.subtitle)}` : "",
        "- A short thin blue-white-red horizontal divider under the titles.",
        fields.tagline ? `- Tagline in small spaced capitals or elegant script: ${quote(fields.tagline)}` : "",
        "Leave clean negative space around the text so it reads clearly over the image.",
        TEXT_RULES,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "character-sheet": {
      const actions = lines(fields.actions, 5);
      const actionLabels = (actions.length ? actions : ["Course", "Saut", "Concentration", "Vue arrière", "Victoire"]).map(
        (a) => `"EN ACTION (${a.toUpperCase()})"`,
      );
      return [
        "Create a professional photorealistic character reference sheet (model sheet / turnaround) of ONE single person.",
        "The person must be strictly identical in every panel: same face, same hairstyle, same body, same outfit, same colours, same logos, same numbers.",
        `Character and outfit: ${subject}`,
        fields.setting ? `Environment in the background of every panel: ${fields.setting}.` : "",
        "Layout: a clean three-row grid separated by thin dark lines; under each panel a small dark navy caption bar with a short white uppercase label in French.",
        'Row 1 — five full-body standing views at the same scale, neutral relaxed pose: "VUE DE FACE", "VUE DE DROITE", "VUE DE DOS", "VUE DE GAUCHE", "VUE 3/4 AVANT".',
        'Row 2 — six close-up detail panels: "GROS PLAN VISAGE (FACE)", "GROS PLAN PROFIL", "DÉTAIL DE LA TENUE", "DÉTAIL DE L\'ÉQUIPEMENT", "DÉTAIL DES ACCESSOIRES", "DÉTAIL DU DOS".',
        `Row 3 — ${actionLabels.length} dynamic action shots: ${actionLabels.join(", ")}.`,
        "Professional sports/studio photography, realistic skin and fabric texture, consistent lighting, sharp focus, high detail.",
        TEXT_RULES,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "infographic": {
      const steps = lines(fields.steps, 8);
      const keyPoints = lines(fields.keyPoints, 6);
      return [
        "Design a clean, modern, professional educational infographic poster, entirely in French.",
        `Topic: ${subject}`,
        `Header (top left, very large bold condensed sans-serif, white with the last words in bright cyan): ${quote(fields.title ?? "")}`,
        fields.subtitle ? `Header subtitle in light blue capitals: ${quote(fields.subtitle)}` : "",
        `Main section: a row of ${steps.length} numbered panels (numbers in white circles), each with a realistic photographic illustration of the step and a short title:`,
        ...steps.map((s, i) => `  ${i + 1}. ${quote(s.toUpperCase())}`),
        "Under each panel, one or two short explanatory lines in French.",
        keyPoints.length
          ? `A side panel titled "POINTS CLÉS" with simple line icons and these items: ${keyPoints.map((k) => quote(k.toUpperCase())).join(", ")}.`
          : "",
        "Style: dark navy background, thin glowing cyan borders, crisp white sans-serif text, consistent photographic illustrations, generous margins, everything aligned on a grid.",
        TEXT_RULES,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "sport-photo":
      return [
        "Editorial sports photography of a professional athlete, shot like an official national-team media day portrait.",
        `Athlete and outfit: ${subject}`,
        fields.setting ? `Location: ${fields.setting}.` : "Location: a professional sports venue, softly blurred in the background.",
        "Full-frame camera, 85 mm lens, f/2.8, sharp focus on the athlete, realistic skin texture with natural sweat or water droplets, accurate official-looking equipment, dramatic yet natural lighting, shallow depth of field, rich colours, magazine-cover quality.",
        "No added text apart from what is printed on the equipment.",
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return subject;
  }
}
