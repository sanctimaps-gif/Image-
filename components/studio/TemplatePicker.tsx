"use client";

import { Camera, Frame, LayoutGrid, PenLine, Presentation, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { TEMPLATES } from "@/lib/templates";
import type { TemplateId } from "@/types/generation";

const ICONS: Record<TemplateId, LucideIcon> = {
  none: PenLine,
  poster: Frame,
  "character-sheet": LayoutGrid,
  infographic: Presentation,
  "sport-photo": Camera,
};

/** Choix du type de création (radio natifs : navigation clavier par flèches). */
export function TemplatePicker({ value, onChange }: { value: TemplateId; onChange: (id: TemplateId) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Type de création</legend>
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {TEMPLATES.map((template) => {
          const Icon = ICONS[template.id];
          const checked = template.id === value;
          return (
            <label
              key={template.id}
              className={cn(
                "flex w-36 shrink-0 cursor-pointer flex-col gap-1 rounded-2xl border p-3 transition-colors sm:w-auto",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)]",
                checked
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-elevated hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name="template"
                value={template.id}
                checked={checked}
                onChange={() => onChange(template.id)}
                className="sr-only"
              />
              <span className={cn("flex items-center gap-2 text-sm font-medium", checked ? "text-accent" : "text-fg")}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {template.label}
              </span>
              <span className="text-xs leading-snug text-muted">{template.description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
