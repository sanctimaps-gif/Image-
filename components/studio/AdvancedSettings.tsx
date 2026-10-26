"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { RadioChips } from "@/components/ui/RadioChips";
import { BACKGROUND_LABELS, OUTPUT_FORMAT_LABELS, QUALITY_LABELS } from "@/lib/catalog";
import type { ComposerSettings } from "@/lib/settings";
import { BACKGROUND_IDS, type ModelInfo } from "@/types/generation";

interface AdvancedSettingsProps {
  models: ModelInfo[];
  model: ModelInfo | null;
  settings: ComposerSettings;
  maxImages: number;
  onChange: (patch: Partial<ComposerSettings>) => void;
}

export function AdvancedSettings({ models, model, settings, maxImages, onChange }: AdvancedSettingsProps) {
  const modelSelectId = useId();
  const compressionId = useId();
  const countLimit = Math.max(1, Math.min(model?.maxImages ?? 1, maxImages));
  const countOptions = Array.from({ length: countLimit }, (_, i) => String(i + 1));

  return (
    <div className="grid gap-5 border-t border-border px-4 py-4 sm:grid-cols-2 sm:px-5">
      <div className="min-w-0">
        <label htmlFor={modelSelectId} className="mb-2 block text-xs font-medium uppercase tracking-wide text-subtle">
          Modèle
        </label>
        <div className="relative">
          <select
            id={modelSelectId}
            value={settings.model}
            onChange={(e) => onChange({ model: e.target.value })}
            disabled={models.length === 0}
            className="h-9 w-full appearance-none rounded-lg border border-border bg-elevated pr-9 pl-3 text-sm text-fg transition-colors hover:border-border-strong disabled:opacity-50"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute top-2.5 right-3 h-4 w-4 text-subtle" />
        </div>
        {model && <p className="mt-1.5 text-xs text-muted">{model.description}</p>}
      </div>

      <RadioChips
        legend="Nombre d'images"
        value={String(settings.count)}
        onChange={(v) => onChange({ count: Number(v) })}
        options={countOptions.map((v) => ({ value: v, label: v }))}
      />

      <RadioChips
        legend="Qualité"
        value={settings.quality}
        onChange={(quality) => onChange({ quality })}
        options={(model?.qualities ?? ["auto"]).map((q) => ({ value: q, label: QUALITY_LABELS[q] }))}
      />

      <RadioChips
        legend="Arrière-plan"
        value={settings.background}
        onChange={(background) =>
          onChange(background === "transparent" && settings.outputFormat === "jpeg" ? { background, outputFormat: "png" } : { background })
        }
        options={BACKGROUND_IDS.map((b) => ({
          value: b,
          label: BACKGROUND_LABELS[b],
          disabled: b === "transparent" && !model?.supportsTransparency,
          disabledReason: model ? `Non pris en charge par ${model.label}` : undefined,
        }))}
      />

      <RadioChips
        legend="Format de fichier"
        value={settings.outputFormat}
        onChange={(outputFormat) => onChange({ outputFormat })}
        options={(model?.outputFormats ?? ["png"]).map((f) => ({
          value: f,
          label: OUTPUT_FORMAT_LABELS[f],
          disabled: f === "jpeg" && settings.background === "transparent",
          disabledReason: "Le JPEG ne gère pas la transparence",
        }))}
      />

      {settings.outputFormat !== "png" && (
        <div className="min-w-0">
          <label htmlFor={compressionId} className="mb-2 flex justify-between text-xs font-medium uppercase tracking-wide text-subtle">
            <span>Qualité de compression</span>
            <span className="font-mono normal-case text-muted">{settings.outputCompression} %</span>
          </label>
          <input
            id={compressionId}
            type="range"
            min={10}
            max={100}
            step={5}
            value={settings.outputCompression}
            onChange={(e) => onChange({ outputCompression: Number(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>
      )}
    </div>
  );
}
