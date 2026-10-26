"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import type { TemplateDefinition } from "@/lib/templates";
import type { TemplateFields } from "@/types/generation";

interface TemplateFieldsFormProps {
  template: TemplateDefinition;
  values: TemplateFields;
  onChange: (key: string, value: string) => void;
}

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle transition-colors hover:border-border-strong focus:border-accent focus:outline-none";

/** Champs propres au modèle créatif (titre, slogan, étapes…), inclus dans le prompt côté serveur. */
export function TemplateFieldsForm({ template, values, onChange }: TemplateFieldsFormProps) {
  const baseId = useId();
  if (template.fields.length === 0) return null;

  return (
    <div className="grid gap-3 border-t border-border px-4 py-4 sm:grid-cols-2 sm:px-5">
      {template.fields.map((field) => {
        const id = `${baseId}-${field.key}`;
        const value = values[field.key] ?? "";
        return (
          <div key={field.key} className={cn("min-w-0", field.multiline && "sm:col-span-2")}>
            <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
              {field.label}
              {field.required && <span className="text-danger"> *</span>}
            </label>
            {field.options ? (
              <div className="relative">
                <select
                  id={id}
                  value={value || field.options[0]!.value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={cn(inputClass, "h-9 appearance-none pr-9")}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden className="pointer-events-none absolute top-2.5 right-3 h-4 w-4 text-subtle" />
              </div>
            ) : field.multiline ? (
              <textarea
                id={id}
                value={value}
                rows={4}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={cn(inputClass, "resize-y py-2 leading-relaxed")}
              />
            ) : (
              <input
                id={id}
                type="text"
                value={value}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={cn(inputClass, "h-9")}
              />
            )}
          </div>
        );
      })}
      <p className="text-xs text-subtle sm:col-span-2">
        Les textes saisis ici sont demandés tels quels au modèle. Le rendu du texte sur l&apos;image est meilleur avec GPT Image 2.
      </p>
    </div>
  );
}
