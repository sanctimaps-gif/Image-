import type { Evaluation } from "@/lib/training/scoring";

/** Évaluations conservées dans le navigateur (quelques Ko), partagées entre composants. */
const KEY = "visionai-training-v1";
const listeners = new Set<() => void>();
let cache: Evaluation[] | null = null;

function read(): Evaluation[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? (parsed as Evaluation[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Evaluation[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible : les notes restent valables pour la session.
  }
  listeners.forEach((l) => l());
}

export const trainingStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: read,
  getServerSnapshot: (): Evaluation[] => EMPTY,
  add(evaluation: Evaluation) {
    write([evaluation, ...read().filter((e) => e.generationId !== evaluation.generationId)]);
  },
  reset() {
    write([]);
  },
};

const EMPTY: Evaluation[] = [];
