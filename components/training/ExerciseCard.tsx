"use client";

import Image from "next/image";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { ImageAnalysisPanel } from "@/components/training/ImageAnalysisPanel";
import { Button } from "@/components/ui/Button";
import { getStyle } from "@/lib/catalog";
import type { Exercise } from "@/lib/training/curriculum";
import { CRITERIA, MAX_PER_CRITERION, suggestedPromptScore, total, type Evaluation, type Scores } from "@/lib/training/scoring";
import type { Generation } from "@/types/generation";

interface ExerciseCardProps {
  exercise: Exercise;
  generation: Generation | null;
  evaluation: Evaluation | null;
  busy: boolean;
  running: boolean;
  status: string | null;
  error: string | null;
  onGenerate: () => void;
  onEvaluate: (evaluation: Omit<Evaluation, "createdAt" | "exerciseId">) => void;
}

const EMPTY_SCORES: Scores = { prompt: 0, composition: 10, realism: 10, colors: 10, details: 10 };

export function ExerciseCard({ exercise, generation, evaluation, busy, running, status, error, onGenerate, onEvaluate }: ExerciseCardProps) {
  const image = generation?.images[0] ?? null;
  const evaluatedThis = evaluation && generation && evaluation.generationId === generation.id ? evaluation : null;
  const [present, setPresent] = useState<boolean[]>(() => evaluatedThis?.present ?? exercise.expected.map(() => false));
  const [scores, setScores] = useState<Scores>(() => evaluatedThis?.scores ?? EMPTY_SCORES);
  const [promptEdited, setPromptEdited] = useState(Boolean(evaluatedThis));
  const shownScores = promptEdited ? scores : { ...scores, prompt: suggestedPromptScore(present) };

  return (
    <article className="rounded-2xl border border-border bg-elevated p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium">{exercise.title}</h4>
          <p className="mt-0.5 text-sm text-muted">« {exercise.prompt} »</p>
          <p className="mt-1 text-xs text-subtle">
            {exercise.style && exercise.style !== "none" && <>Style : {getStyle(exercise.style).label} · </>}
            {exercise.enhance === false
              ? "Sans étape de compréhension"
              : exercise.enhance
                ? "Avec étape de compréhension"
                : "Réglages par défaut"}
          </p>
        </div>
        {evaluation && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
            {total(evaluation.scores)}/100
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" variant={image ? "secondary" : "primary"} onClick={onGenerate} disabled={busy} loading={running}>
          <Sparkles className="h-4 w-4" aria-hidden />
          {image ? "Regénérer" : "Générer"}
        </Button>
        {status && <span className="text-xs text-muted" aria-live="polite">{status}</span>}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      {image && generation && (
        <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-3">
            <Image
              src={image.url}
              alt={exercise.prompt}
              width={image.width}
              height={image.height}
              unoptimized
              className="w-full rounded-xl border border-border"
            />
            <ImageAnalysisPanel src={image.url} />
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onEvaluate({ generationId: generation.id, scores: shownScores, present, enhance: Boolean(generation.revisedPrompt) });
            }}
          >
            {generation.revisedPrompt && (
              <p className="text-xs text-muted">
                <span className="font-medium text-fg">Demande comprise : </span>
                <span lang="en">{generation.revisedPrompt}</span>
              </p>
            )}
            <fieldset>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Éléments présents sur l&apos;image</legend>
              <div className="space-y-1.5">
                {exercise.expected.map((item, i) => (
                  <label key={item} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={present[i] ?? false}
                      onChange={(e) => {
                        setPresent((p) => p.map((v, j) => (j === i ? e.target.checked : v)));
                        // La note « respect du prompt » suit à nouveau la liste cochée.
                        setPromptEdited(false);
                      }}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-subtle">Notes (sur 20)</legend>
              {CRITERIA.map((c) => (
                <label key={c.key} className="grid grid-cols-[minmax(0,1fr)_120px_2.5rem] items-center gap-3 text-sm">
                  <span>
                    {c.label}
                    {c.key === "prompt" && !promptEdited && <span className="text-xs text-subtle"> (calculée)</span>}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={MAX_PER_CRITERION}
                    value={shownScores[c.key]}
                    onChange={(e) => {
                      if (c.key === "prompt") setPromptEdited(true);
                      setScores({ ...shownScores, [c.key]: Number(e.target.value) });
                    }}
                    className="accent-[var(--accent)]"
                  />
                  <span className="text-right font-mono">{shownScores[c.key]}</span>
                </label>
              ))}
              <p className="text-sm font-semibold">Total : {total(shownScores)}/100</p>
            </fieldset>

            <Button type="submit" size="sm" variant="primary">
              <Check className="h-4 w-4" aria-hidden />
              {evaluatedThis ? "Mettre à jour la note" : "Enregistrer la note"}
            </Button>
          </form>
        </div>
      )}
    </article>
  );
}
