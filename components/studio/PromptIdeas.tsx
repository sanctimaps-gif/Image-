"use client";

import { Lightbulb, Plus } from "lucide-react";
import { useState } from "react";
import { appendDetail, DIMENSIONS, isShortPrompt, proposeVariations } from "@/lib/prompt-expansion";

interface PromptIdeasProps {
  prompt: string;
  onChange: (prompt: string) => void;
}

/**
 * Co-création guidée : pour une description courte, propose des déclinaisons complètes
 * et des précisions à ajouter (décor, lumière, cadrage, rendu) avant de générer.
 */
export function PromptIdeas({ prompt, onChange }: PromptIdeasProps) {
  const short = isShortPrompt(prompt);
  // S'ouvre dès qu'une description courte apparaît et le reste ; l'utilisateur garde la main.
  const [autoOpened, setAutoOpened] = useState(false);
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  if (short && !autoOpened) setAutoOpened(true);
  const open = userChoice ?? autoOpened;
  if (!prompt.trim()) return null;
  const variations = short ? proposeVariations(prompt) : [];

  return (
    <details open={open} onToggle={(e) => {
        if (e.currentTarget.open !== open) setUserChoice(e.currentTarget.open);
      }} className="group border-t border-border px-4 py-3 sm:px-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-fg">
        <Lightbulb className="h-4 w-4 text-accent" aria-hidden />
        {short ? "Description courte : précisez votre idée" : "Ajouter des précisions"}
      </summary>

      {short && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-muted">Choisissez une déclinaison (vous pourrez la modifier) :</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {variations.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onChange(v.prompt)}
                  className="h-full w-full rounded-xl border border-border bg-bg p-3 text-left text-xs transition-colors hover:border-accent"
                >
                  <span className="mb-0.5 block text-sm font-medium text-fg">{v.label}</span>
                  <span className="line-clamp-3 text-muted">{v.prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {DIMENSIONS.map((dimension) => (
          <div key={dimension.id} className="flex min-w-0 items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-medium text-subtle">{dimension.label}</span>
            <div className="scrollbar-none -my-1 flex min-w-0 gap-1.5 overflow-x-auto py-1">
              {dimension.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(appendDetail(prompt, option))}
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border bg-elevated px-2.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  <Plus className="h-3 w-3" aria-hidden />
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
