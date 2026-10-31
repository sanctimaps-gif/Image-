import { ALL_EXERCISES, CURRICULUM } from "@/lib/training/curriculum";

export const CRITERIA = [
  { key: "prompt", label: "Respect du prompt" },
  { key: "composition", label: "Composition" },
  { key: "realism", label: "Réalisme" },
  { key: "colors", label: "Couleurs" },
  { key: "details", label: "Détails" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];
export type Scores = Record<CriterionKey, number>;

/** Évaluation d'une génération d'exercice (chaque critère sur 20, total sur 100). */
export interface Evaluation {
  exerciseId: string;
  generationId: string;
  scores: Scores;
  /** Éléments attendus effectivement présents, dans l'ordre de l'exercice. */
  present: boolean[];
  enhance: boolean;
  createdAt: string;
}

export const MAX_PER_CRITERION = 20;

export function total(scores: Scores): number {
  return CRITERIA.reduce((sum, c) => sum + clamp(scores[c.key]), 0);
}

/** Note « respect du prompt » suggérée : part des éléments attendus présents, ramenée sur 20. */
export function suggestedPromptScore(present: boolean[]): number {
  if (present.length === 0) return 0;
  return Math.round((present.filter(Boolean).length / present.length) * MAX_PER_CRITERION);
}

/** Dernière évaluation de chaque exercice (les plus récentes en premier dans `evaluations`). */
export function latestByExercise(evaluations: Evaluation[]): Map<string, Evaluation> {
  const latest = new Map<string, Evaluation>();
  for (const e of [...evaluations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!latest.has(e.exerciseId)) latest.set(e.exerciseId, e);
  }
  return latest;
}

export interface ModuleProgress {
  moduleId: string;
  rated: number;
  count: number;
  /** Moyenne /100 des exercices notés, ou null si aucun. */
  average: number | null;
}

export function moduleProgress(evaluations: Evaluation[]): ModuleProgress[] {
  const latest = latestByExercise(evaluations);
  return CURRICULUM.map((m) => {
    const totals = m.exercises.map((e) => latest.get(e.id)).filter((e): e is Evaluation => Boolean(e)).map((e) => total(e.scores));
    return {
      moduleId: m.id,
      rated: totals.length,
      count: m.exercises.length,
      average: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
    };
  });
}

/** Avancement global : part des 40 exercices notés au moins une fois. */
export function overallProgress(evaluations: Evaluation[]): number {
  return Math.round((latestByExercise(evaluations).size / ALL_EXERCISES.length) * 100);
}

/** Module « Optimisation » : moyenne des notes avec et sans étape de compréhension, sur toutes les évaluations. */
export function enhanceComparison(evaluations: Evaluation[]): { with: number | null; without: number | null; counts: [number, number] } {
  const avg = (list: Evaluation[]) => (list.length ? Math.round(list.reduce((s, e) => s + total(e.scores), 0) / list.length) : null);
  const withE = evaluations.filter((e) => e.enhance);
  const withoutE = evaluations.filter((e) => !e.enhance);
  return { with: avg(withE), without: avg(withoutE), counts: [withE.length, withoutE.length] };
}

function clamp(value: number): number {
  return Math.min(MAX_PER_CRITERION, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
}
