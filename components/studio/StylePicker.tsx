"use client";

import { RadioChips } from "@/components/ui/RadioChips";
import { STYLES } from "@/lib/catalog";
import type { StyleId } from "@/types/generation";

export function StylePicker({ value, onChange }: { value: StyleId; onChange: (style: StyleId) => void }) {
  return (
    <RadioChips
      legend="Style artistique"
      value={value}
      onChange={onChange}
      scrollable
      options={STYLES.map((style) => ({ value: style.id, label: style.label }))}
    />
  );
}
