"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export interface ChipOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: string;
  disabled?: boolean;
  disabledReason?: string;
  icon?: ReactNode;
}

interface RadioChipsProps<T extends string> {
  legend: string;
  value: T;
  options: ChipOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  scrollable?: boolean;
  hideLegend?: boolean;
}

/**
 * Groupe de boutons radio natifs stylisés : navigation clavier (flèches) et lecteurs d'écran gratuits.
 */
export function RadioChips<T extends string>({
  legend,
  value,
  options,
  onChange,
  className,
  scrollable = false,
  hideLegend = false,
}: RadioChipsProps<T>) {
  const name = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={cn("mb-2 text-xs font-medium uppercase tracking-wide text-subtle", hideLegend && "sr-only")}>
        {legend}
      </legend>
      <div className={cn("flex gap-1.5", scrollable ? "scrollbar-none -mx-1 overflow-x-auto px-1 pb-1" : "flex-wrap")}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              title={option.disabled ? option.disabledReason : option.hint}
              className={cn(
                "relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ring)]",
                checked
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-elevated text-muted hover:border-border-strong hover:text-fg",
                option.disabled && "cursor-not-allowed opacity-45 hover:border-border hover:text-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon}
              {option.label}
              {option.disabled && option.disabledReason && <span className="sr-only"> — {option.disabledReason}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
