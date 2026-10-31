import type { StyleId } from "@/types/generation";

/**
 * Programme d'entraînement « par les prompts » : 8 modules, 40 exercices.
 * Chaque exercice fixe une description et la liste des éléments attendus,
 * pour évaluer objectivement si le modèle respecte la consigne.
 */
export interface Exercise {
  id: string;
  title: string;
  prompt: string;
  /** Éléments qui doivent être visibles sur l'image. */
  expected: string[];
  style?: StyleId;
  /** Forcer ou désactiver l'étape de compréhension (module « Optimisation »). */
  enhance?: boolean;
}

export interface TrainingModule {
  id: string;
  number: number;
  title: string;
  goal: string;
  exercises: Exercise[];
}

const ex = (id: string, title: string, prompt: string, expected: string[], extra: Partial<Exercise> = {}): Exercise => ({
  id,
  title,
  prompt,
  expected,
  ...extra,
});

const SCENE = "Un vieux phare sur une falaise au bord de la mer, au coucher du soleil";

export const CURRICULUM: readonly TrainingModule[] = [
  {
    id: "langage",
    number: 1,
    title: "Compréhension du langage",
    goal: "Comprendre exactement la demande, sans oublier d'élément.",
    exercises: [
      ex("m1-sujet", "Sujet principal", "Un renard roux au milieu d'une prairie verte", ["Un renard", "Le renard est roux", "Une prairie verte", "Le renard est le sujet principal"]),
      ex("m1-couleurs", "Couleurs demandées", "Un parapluie jaune et une paire de bottes rouges posés sur un sol gris", ["Parapluie jaune", "Bottes rouges", "Sol gris"]),
      ex("m1-secondaires", "Objets secondaires", "Un bureau en bois avec une lampe, une tasse de café et un livre ouvert", ["Un bureau en bois", "Une lampe", "Une tasse de café", "Un livre ouvert"]),
      ex("m1-positions", "Positions spatiales", "Une pomme rouge posée sur une boîte bleue, à gauche d'un verre d'eau", ["Pomme rouge", "La pomme est sur la boîte", "Boîte bleue", "Un verre d'eau à droite de la boîte"]),
      ex("m1-test", "Test du module", "Un chien blanc assis devant une voiture noire, dans une rue éclairée par des néons violets", ["Un chien blanc", "Le chien est assis", "Une voiture noire", "Le chien est devant la voiture", "Une rue", "Des néons violets"]),
    ],
  },
  {
    id: "formes",
    number: 2,
    title: "Formes et géométrie",
    goal: "Maîtriser les structures et les volumes.",
    exercises: [
      ex("m2-cube", "Un cube", "Un cube blanc posé sur un sol gris clair, fond uni, éclairage de studio", ["Un cube", "Arêtes droites", "Fond uni"]),
      ex("m2-sphere", "Une sphère", "Une sphère orange posée sur un sol gris clair, fond uni, éclairage de studio", ["Une sphère", "Forme parfaitement ronde", "Ombre au sol"]),
      ex("m2-cylindre", "Un cylindre", "Un cylindre bleu debout sur un sol gris clair, fond uni, éclairage de studio", ["Un cylindre", "Debout", "Bords réguliers"]),
      ex("m2-combinaison", "Formes combinées", "Une sphère rouge posée sur un cube blanc, à côté d'un cylindre bleu, fond uni", ["Sphère rouge", "Cube blanc", "La sphère est sur le cube", "Cylindre bleu à côté"]),
      ex("m2-profondeur", "Scène en profondeur", "Une allée de colonnes de pierre qui s'éloignent jusqu'à l'horizon, perspective centrale", ["Des colonnes", "Elles rapetissent avec la distance", "Un point de fuite"]),
    ],
  },
  {
    id: "lumiere",
    number: 3,
    title: "Couleurs et éclairage",
    goal: "Comprendre les relations entre lumière et couleur.",
    exercises: [
      ex("m3-naturelle", "Lumière naturelle", "Une cuisine lumineuse éclairée par la lumière du jour qui entre par une grande fenêtre", ["Une cuisine", "Une fenêtre", "Lumière du jour qui entre"]),
      ex("m3-artificielle", "Lumière artificielle", "Une ruelle la nuit éclairée par des lampadaires orange", ["Nuit", "Des lampadaires", "Lumière orange"]),
      ex("m3-contrejour", "Contre-jour", "La silhouette d'un arbre en contre-jour devant un soleil couchant", ["Un arbre en silhouette sombre", "Soleil derrière", "Ciel lumineux"]),
      ex("m3-ombres", "Ombres douces", "Un vase blanc sur une table, lumière douce et diffuse, ombres très douces", ["Un vase blanc", "Une table", "Ombres douces sans contours durs"]),
      ex("m3-reflets", "Reflets métalliques", "Une théière en métal chromé brillant qui reflète la pièce autour d'elle", ["Une théière", "Métal chromé", "Reflets visibles"]),
    ],
  },
  {
    id: "photorealisme",
    number: 4,
    title: "Photoréalisme",
    goal: "Améliorer la cohérence visuelle et les matières.",
    exercises: [
      ex("m4-matieres", "Matières réalistes", "Gros plan d'une table en bois brut avec une cuillère en métal et une serviette en lin", ["Bois avec veinage", "Métal", "Tissu de lin"], { style: "photorealistic" }),
      ex("m4-textures", "Textures", "Gros plan d'un mur de briques anciennes couvert de mousse", ["Briques", "Mousse verte", "Texture détaillée"], { style: "photorealistic" }),
      ex("m4-proportions", "Proportions", "Une tasse de café posée à côté d'un smartphone sur une table", ["Une tasse", "Un smartphone", "Tailles cohérentes entre eux"], { style: "photorealistic" }),
      ex("m4-details", "Détails", "Gros plan d'une montre mécanique ouverte montrant ses engrenages", ["Une montre", "Des engrenages visibles", "Détails fins"], { style: "photorealistic" }),
      ex("m4-eclairage", "Éclairage photographique", "Portrait d'une personne âgée près d'une fenêtre, lumière latérale douce, photographie", ["Une personne âgée", "Lumière venant du côté", "Rendu photographique"], { style: "photorealistic" }),
    ],
  },
  {
    id: "anatomie",
    number: 5,
    title: "Anatomie et objets complexes",
    goal: "Cohérence des proportions, des contours et des détails.",
    exercises: [
      ex("m5-visage", "Visage stylisé", "Portrait stylisé d'une jeune femme souriante, illustration", ["Un visage", "Deux yeux symétriques", "Un sourire"], { style: "illustration" }),
      ex("m5-silhouette", "Silhouette habillée", "Un homme debout en pied, vêtu d'un manteau long et d'un chapeau", ["Corps entier", "Manteau long", "Chapeau", "Proportions humaines correctes"]),
      ex("m5-animal", "Animal", "Un cheval brun au galop dans un champ", ["Un cheval", "Quatre pattes", "Au galop", "Un champ"]),
      ex("m5-vetements", "Vêtements", "Une veste en jean accrochée à un portemanteau", ["Une veste en jean", "Coutures et boutons", "Un portemanteau"]),
      ex("m5-mecanique", "Objet mécanique", "Une bicyclette rouge garée contre un mur blanc", ["Une bicyclette", "Deux roues", "Un guidon et une chaîne", "Mur blanc"]),
    ],
  },
  {
    id: "styles",
    number: 6,
    title: "Styles artistiques",
    goal: "Distinguer les styles sur une même scène.",
    exercises: [
      ex("m6-photo", "Style photographique", SCENE, ["Un phare", "Une falaise", "Coucher de soleil", "Rendu photographique"], { style: "photorealistic" }),
      ex("m6-aquarelle", "Style aquarelle", SCENE, ["Un phare", "Une falaise", "Coucher de soleil", "Rendu aquarelle"], { style: "watercolor" }),
      ex("m6-anime", "Style anime", SCENE, ["Un phare", "Une falaise", "Coucher de soleil", "Rendu anime"], { style: "anime" }),
      ex("m6-pixel", "Style pixel art", SCENE, ["Un phare", "Une falaise", "Coucher de soleil", "Rendu pixel art"], { style: "pixel-art" }),
      ex("m6-libre", "Comparaison", `${SCENE}, style peinture à l'huile`, ["Un phare", "Une falaise", "Rendu peinture à l'huile", "Différent des quatre autres styles"]),
    ],
  },
  {
    id: "instructions",
    number: 7,
    title: "Respect des instructions",
    goal: "Éviter les erreurs de génération.",
    exercises: [
      ex("m7-trois", "Exactement trois objets", "Exactement trois pommes vertes alignées sur une table blanche, rien d'autre", ["Exactement 3 pommes", "Pommes vertes", "Table blanche", "Aucun autre objet"]),
      ex("m7-palette", "Palette de deux couleurs", "Un paysage de montagnes uniquement en bleu et en blanc, palette de deux couleurs", ["Des montagnes", "Seulement du bleu et du blanc"]),
      ex("m7-fond", "Arrière-plan imposé", "Une chaise en bois devant un fond rose uni", ["Une chaise en bois", "Fond rose", "Fond uni sans décor"]),
      ex("m7-centre", "Composition centrée", "Une seule fleur de tournesol parfaitement centrée, fond vert uni", ["Un tournesol", "Parfaitement centré", "Fond vert uni"]),
      ex("m7-complet", "Tous les éléments", "Un chat noir, un ballon rouge et un tabouret jaune dans une pièce aux murs blancs", ["Un chat noir", "Un ballon rouge", "Un tabouret jaune", "Murs blancs"]),
    ],
  },
  {
    id: "optimisation",
    number: 8,
    title: "Optimisation",
    goal: "Mesurer ce qui améliore les résultats.",
    exercises: [
      ex("m8-sans", "Sans étape de compréhension", "Un chalet en bois sous la neige, fenêtres éclairées, la nuit", ["Un chalet en bois", "De la neige", "Fenêtres éclairées", "La nuit"], { enhance: false }),
      ex("m8-avec", "Avec étape de compréhension", "Un chalet en bois sous la neige, fenêtres éclairées, la nuit", ["Un chalet en bois", "De la neige", "Fenêtres éclairées", "La nuit"], { enhance: true }),
      ex("m8-court", "Description courte", "Un dragon", ["Un dragon"], { enhance: false }),
      ex("m8-detaille", "Description détaillée", "Un dragon vert aux ailes déployées perché sur un rocher, au-dessus d'une vallée brumeuse, lumière du matin", ["Un dragon vert", "Ailes déployées", "Sur un rocher", "Vallée brumeuse", "Lumière du matin"], { enhance: false }),
      ex("m8-anglais", "Description en anglais", "A green dragon with spread wings perched on a rock above a misty valley, morning light", ["Un dragon vert", "Ailes déployées", "Sur un rocher", "Vallée brumeuse", "Lumière du matin"], { enhance: false }),
    ],
  },
];

export const ALL_EXERCISES = CURRICULUM.flatMap((m) => m.exercises.map((e) => ({ ...e, moduleId: m.id })));
