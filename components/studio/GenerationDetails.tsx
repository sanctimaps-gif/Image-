import { ASPECT_LABELS, BACKGROUND_LABELS, OUTPUT_FORMAT_LABELS, QUALITY_LABELS, getStyle } from "@/lib/catalog";
import type { Generation, ModelInfo } from "@/types/generation";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** Paramètres réellement utilisés pour une génération. */
export function GenerationDetails({ generation, models }: { generation: Generation; models: ModelInfo[] }) {
  const s = generation.settings;
  const modelLabel = models.find((m) => m.id === s.model)?.label ?? s.model;
  const rows: [string, string][] = [
    ["Modèle", modelLabel],
    ["Style", getStyle(s.style).label],
    ["Format", `${ASPECT_LABELS[s.aspect].label} ${ASPECT_LABELS[s.aspect].ratio} · ${generation.size.replace("x", " × ")}`],
    ["Qualité", QUALITY_LABELS[s.quality]],
    ["Arrière-plan", BACKGROUND_LABELS[s.background]],
    ["Fichier", `${OUTPUT_FORMAT_LABELS[s.outputFormat]}${s.outputCompression !== null ? ` · ${s.outputCompression} %` : ""}`],
    ["Type", generation.kind === "variation" ? "Variante" : "Texte → image"],
    ["Créée le", formatDate(generation.createdAt)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-subtle">{label}</dt>
          <dd className="font-medium break-words text-fg">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
