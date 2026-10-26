"use client";

import { RadioChips, type ChipOption } from "@/components/ui/RadioChips";
import { ASPECT_LABELS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { ASPECT_IDS, type AspectId, type ModelInfo } from "@/types/generation";

const SHAPES: Record<AspectId, string> = {
  square: "h-3 w-3",
  portrait: "h-3.5 w-[9px]",
  landscape: "h-[9px] w-3.5",
  widescreen: "h-2 w-3.5",
};

interface FormatPickerProps {
  model: ModelInfo | null;
  value: AspectId;
  onChange: (aspect: AspectId) => void;
}

/** Formats disponibles d'après les capacités réelles du modèle ; les autres sont affichés désactivés. */
export function FormatPicker({ model, value, onChange }: FormatPickerProps) {
  const options: ChipOption<AspectId>[] = ASPECT_IDS.map((aspect) => {
    const format = model?.formats.find((f) => f.aspect === aspect);
    const { label, ratio } = ASPECT_LABELS[aspect];
    return {
      value: aspect,
      label: (
        <>
          {label}
          <span className="font-normal opacity-70">{ratio}</span>
        </>
      ),
      hint: format ? `${format.width} × ${format.height} px` : undefined,
      disabled: !format,
      disabledReason: model ? `Non pris en charge par ${model.label}` : "Aucun modèle disponible",
      icon: <span aria-hidden className={cn("rounded-[2px] border-[1.5px] border-current", SHAPES[aspect])} />,
    };
  });

  return <RadioChips legend="Format" value={value} options={options} onChange={onChange} scrollable />;
}
