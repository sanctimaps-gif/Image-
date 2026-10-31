"use client";

import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useBackend } from "@/components/BackendProvider";
import { ExerciseCard } from "@/components/training/ExerciseCard";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api-client";
import { CURRICULUM, type Exercise } from "@/lib/training/curriculum";
import { enhanceComparison, latestByExercise, moduleProgress, overallProgress, total } from "@/lib/training/scoring";
import { trainingStore } from "@/lib/training/store";
import type { AppConfig, Generation, GenerationProgressInfo } from "@/types/generation";

function describe(progress: GenerationProgressInfo | null): string {
  if (!progress) return "Préparation…";
  if (progress.phase === "download")
    return `Téléchargement du modèle : ${Math.round((progress.loaded / Math.max(1, progress.total)) * 100)} %`;
  if (progress.phase === "understand") return "Compréhension de la demande…";
  return `Création de l'image : ${Math.round(progress.ratio * 100)} %`;
}

/**
 * Banc d'entraînement « par les prompts » : on fait générer chaque exercice, on note le résultat
 * sur 100 selon 5 critères, et on suit la progression module par module.
 */
export function TrainingApp({ config }: { config: AppConfig }) {
  const backend = useBackend();
  const toast = useToast();
  const evaluations = useSyncExternalStore(trainingStore.subscribe, trainingStore.getSnapshot, trainingStore.getServerSnapshot);
  const [generations, setGenerations] = useState<Map<string, Generation>>(new Map());
  const [lastByExercise, setLastByExercise] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<{ exerciseId: string; progress: GenerationProgressInfo | null } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const provider = config.providers.find((p) => p.configured) ?? null;
  const model = provider?.models.find((m) => m.id === provider.defaultModel) ?? provider?.models[0] ?? null;

  // Images des évaluations passées, retrouvées dans l'historique.
  useEffect(() => {
    let cancelled = false;
    backend
      .list()
      .then((list) => !cancelled && setGenerations(new Map(list.map((g) => [g.id, g]))))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [backend]);

  const latest = latestByExercise(evaluations);
  const progress = moduleProgress(evaluations);
  const overall = overallProgress(evaluations);
  const comparison = enhanceComparison(evaluations);

  const generate = useCallback(
    async (exercise: Exercise) => {
      if (!provider || !model || running) return;
      setRunning({ exerciseId: exercise.id, progress: null });
      setErrors((current) => {
        const next = { ...current };
        delete next[exercise.id];
        return next;
      });
      try {
        const generation = await backend.generate(
          {
            prompt: exercise.prompt,
            providerId: provider.id,
            model: model.id,
            style: exercise.style ?? "none",
            template: "none",
            aspect: model.formats[0]!.aspect,
            quality: model.qualities[0] ?? "auto",
            outputFormat: model.outputFormats[0] ?? "png",
            count: 1,
            enhancePrompt: Boolean(model.supportsPromptEnhancement) && (exercise.enhance ?? true),
          },
          undefined,
          (p) => setRunning((r) => (r && r.exerciseId === exercise.id ? { ...r, progress: p } : r)),
        );
        setGenerations((m) => new Map(m).set(generation.id, generation));
        setLastByExercise((m) => ({ ...m, [exercise.id]: generation.id }));
      } catch (error) {
        setErrors((e) => ({
          ...e,
          [exercise.id]: error instanceof ApiClientError ? error.message : "La génération a échoué.",
        }));
      } finally {
        setRunning(null);
      }
    },
    [backend, provider, model, running],
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 pt-10 pb-20 sm:px-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Entraînement</h1>
        <p className="max-w-3xl text-muted">
          Un parcours de 8 modules et 40 exercices pour évaluer et améliorer les résultats de votre IA. Chaque exercice
          génère une image, en analyse les pixels, puis vous la notez sur 100 (5 critères sur 20).
        </p>
        <p className="max-w-3xl rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          <strong className="font-medium text-fg">Entraînement par les prompts, pas réentraînement du modèle.</strong> Modifier
          réellement les paramètres d&apos;un réseau (PyTorch, LoRA, optimiseur AdamW) demande une carte graphique et un jeu
          de données ; ce n&apos;est pas faisable dans un navigateur. Ici, on mesure ce qui marche (descriptions, styles,
          étape de compréhension) pour mieux guider le modèle.
        </p>
      </header>

      <section aria-labelledby="progress-title" className="rounded-3xl border border-border bg-elevated p-5 shadow-card sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="progress-title" className="text-xl font-semibold">
              Tableau de suivi
            </h2>
            <p className="text-sm text-muted">Note la plus récente de chaque exercice. Conservé dans ce navigateur.</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (window.confirm("Effacer toutes les notes d'entraînement ?")) trainingStore.reset();
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser le suivi
          </Button>
        </div>

        <div className="mb-5">
          <div className="mb-1 flex justify-between text-sm">
            <span>Progression</span>
            <span className="font-semibold">{overall} %</span>
          </div>
          <div role="progressbar" aria-valuenow={overall} aria-valuemin={0} aria-valuemax={100} aria-label="Progression" className="h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${overall}%` }} />
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {CURRICULUM.map((m, i) => {
            const p = progress[i]!;
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-sm">
                <a href={`#${m.id}`} className="min-w-0 truncate hover:text-accent">
                  Module {m.number} : {m.title}
                </a>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {p.average === null ? "—" : `${p.average}/100`} · {p.rated}/{p.count}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 rounded-xl border border-border p-3 text-sm">
          <p className="font-medium">Optimisation : étape de compréhension</p>
          <p className="text-muted">
            Moyenne avec : <strong className="text-fg">{comparison.with ?? "—"}</strong>/100 ({comparison.counts[0]} note
            {comparison.counts[0] > 1 ? "s" : ""}) · sans : <strong className="text-fg">{comparison.without ?? "—"}</strong>/100 (
            {comparison.counts[1]} note{comparison.counts[1] > 1 ? "s" : ""}).
            {comparison.with !== null && comparison.without !== null && (
              <>
                {" "}
                {comparison.with >= comparison.without
                  ? "La compréhension améliore vos résultats : gardez-la activée."
                  : "Vos images sont mieux notées sans : essayez de la désactiver dans les réglages."}
              </>
            )}
          </p>
        </div>
      </section>

      {!model && <p className="text-sm text-danger">Aucun modèle de génération n&apos;est disponible.</p>}

      {CURRICULUM.map((m) => (
        <section key={m.id} id={m.id} aria-labelledby={`${m.id}-title`} className="scroll-mt-24 space-y-4">
          <div>
            <h3 id={`${m.id}-title`} className="text-lg font-semibold">
              Module {m.number} — {m.title}
            </h3>
            <p className="text-sm text-muted">{m.goal}</p>
          </div>
          {m.exercises.map((exercise) => {
            const evaluation = latest.get(exercise.id) ?? null;
            const generationId = lastByExercise[exercise.id] ?? evaluation?.generationId;
            const generation = (generationId && generations.get(generationId)) || null;
            const isRunning = running?.exerciseId === exercise.id;
            return (
              <ExerciseCard
                key={`${exercise.id}-${generation?.id ?? "none"}`}
                exercise={exercise}
                generation={generation}
                evaluation={evaluation}
                busy={Boolean(running) || !model}
                running={isRunning}
                status={isRunning ? describe(running.progress) : null}
                error={errors[exercise.id] ?? null}
                onGenerate={() => void generate(exercise)}
                onEvaluate={(e) => {
                  trainingStore.add({ ...e, exerciseId: exercise.id, createdAt: new Date().toISOString() });
                  toast.show(`Note enregistrée : ${total(e.scores)}/100`, "success");
                }}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
