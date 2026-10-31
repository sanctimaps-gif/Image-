/**
 * Enrichissement des descriptions courtes (« prompt expansion »), sans modèle :
 * - des déclinaisons complètes à choisir (co-création guidée) ;
 * - des précisions à ajouter, rangées par dimension (décor, lumière, cadrage, rendu).
 * Les choix suivent quelques principes : harmonie visuelle, contraste chaud/froid,
 * échelle humaine pour donner de la grandeur.
 */

export interface ExpansionDimension {
  id: "decor" | "lumiere" | "cadrage" | "rendu";
  label: string;
  options: string[];
}

export const DIMENSIONS: readonly ExpansionDimension[] = [
  {
    id: "decor",
    label: "Décor",
    options: [
      "sur une île rocheuse au milieu de la mer",
      "au sommet d'une montagne enneigée",
      "au cœur d'une forêt brumeuse",
      "dans une ville futuriste",
      "au milieu d'un désert de dunes",
    ],
  },
  {
    id: "lumiere",
    label: "Lumière",
    options: [
      "au coucher du soleil, ciel orange et violet",
      "dans la brume matinale",
      "sous un ciel d'orage",
      "la nuit sous un ciel étoilé",
      "en plein jour, lumière douce",
    ],
  },
  {
    id: "cadrage",
    label: "Cadrage",
    options: [
      "vue panoramique en grand angle",
      "vue aérienne",
      "gros plan",
      "en contre-plongée",
      "avec de petits personnages pour donner l'échelle",
    ],
  },
  {
    id: "rendu",
    label: "Rendu",
    options: [
      "photographie ultra détaillée",
      "peinture à l'huile",
      "illustration fantasy",
      "rendu 3D cinématographique",
      "aquarelle",
    ],
  },
];

export interface Variation {
  id: string;
  label: string;
  prompt: string;
}

/** Déclinaisons cohérentes : chaque ambiance associe décor, lumière, cadrage et rendu qui vont ensemble. */
const BUNDLES: { id: string; label: string; parts: string[] }[] = [
  {
    id: "cinematique",
    label: "Cinématographique",
    parts: [
      "sur une île rocheuse au milieu de la mer",
      "au coucher du soleil, ciel orange et violet, reflets sur l'eau",
      "vue panoramique en grand angle, avec de petits personnages pour donner l'échelle",
      "photographie ultra détaillée",
    ],
  },
  {
    id: "hiver",
    label: "Hiver",
    parts: ["au sommet d'une montagne enneigée", "au lever du soleil, lumière dorée sur la neige", "vue aérienne", "photographie ultra détaillée"],
  },
  {
    id: "mystere",
    label: "Mystère",
    parts: ["au cœur d'une forêt brumeuse", "dans la brume matinale, rayons de lumière entre les arbres", "en contre-plongée", "peinture à l'huile"],
  },
  {
    id: "fantasy",
    label: "Fantasy nocturne",
    parts: ["dans un paysage magique", "la nuit sous un ciel étoilé, lueurs bleues et dorées", "vue panoramique en grand angle", "illustration fantasy"],
  },
];

/** Une description est jugée courte jusqu'à 6 mots : elle laisse trop de choix au modèle. */
export function isShortPrompt(prompt: string): boolean {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 6;
}

export function proposeVariations(prompt: string): Variation[] {
  const subject = prompt.trim().replace(/[.!?…]+$/, "");
  if (!subject) return [];
  return BUNDLES.map((b) => ({ id: b.id, label: b.label, prompt: `${subject}, ${b.parts.join(", ")}` }));
}

/** Ajoute une précision à la description, sans doublon. */
export function appendDetail(prompt: string, detail: string): string {
  const base = prompt.trim().replace(/[.!?…]+$/, "");
  if (!base) return detail;
  if (base.toLowerCase().includes(detail.toLowerCase())) return base;
  return `${base}, ${detail}`;
}
