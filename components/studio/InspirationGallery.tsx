import { ArrowUp } from "lucide-react";
import { ASPECT_LABELS, getStyle } from "@/lib/catalog";
import type { AspectId, StyleId } from "@/types/generation";

export interface Inspiration {
  title: string;
  prompt: string;
  style: StyleId;
  aspect: AspectId;
  /** Dégradé décoratif : il ne s'agit pas d'une image générée. */
  gradient: string;
}

export const INSPIRATIONS: Inspiration[] = [
  {
    title: "Château futuriste",
    prompt:
      "Un château futuriste au sommet d'une montagne, au coucher du soleil, photographie cinématographique ultra détaillée.",
    style: "cinematic",
    aspect: "landscape",
    gradient: "from-orange-300 via-rose-400 to-indigo-600",
  },
  {
    title: "Renard des neiges",
    prompt: "Un renard arctique endormi dans la neige poudreuse, lumière douce du matin, gros plan, flocons en suspension.",
    style: "photorealistic",
    aspect: "portrait",
    gradient: "from-sky-100 via-slate-300 to-blue-500",
  },
  {
    title: "Ruelle de Tokyo",
    prompt: "Une ruelle de Tokyo sous la pluie la nuit, enseignes néon qui se reflètent dans les flaques, ambiance mélancolique.",
    style: "anime",
    aspect: "widescreen",
    gradient: "from-fuchsia-500 via-violet-600 to-cyan-400",
  },
  {
    title: "Jardin suspendu",
    prompt: "Un jardin suspendu flottant dans les nuages, cascades qui tombent dans le vide, oiseaux lumineux, atmosphère paisible.",
    style: "fantasy",
    aspect: "square",
    gradient: "from-emerald-300 via-teal-400 to-sky-600",
  },
  {
    title: "Café d'architecte",
    prompt: "Un petit café minimaliste en béton et bois clair, grandes baies vitrées, plantes vertes, lumière naturelle de midi.",
    style: "3d-render",
    aspect: "landscape",
    gradient: "from-stone-200 via-amber-200 to-stone-500",
  },
  {
    title: "Logo de boulangerie",
    prompt: "Un logo pour une boulangerie artisanale nommée « Mie Dorée », épi de blé stylisé et croissant, tons chauds.",
    style: "logo-design",
    aspect: "square",
    gradient: "from-amber-200 via-yellow-400 to-orange-500",
  },
];

/** Exemples de prompts pour inspirer l'utilisateur (aucune fausse image : ce sont des cartes textuelles). */
export function InspirationGallery({ onPick }: { onPick: (inspiration: Inspiration) => void }) {
  return (
    <section aria-labelledby="inspiration-title">
      <div className="mb-5">
        <h2 id="inspiration-title" className="text-xl font-semibold tracking-tight">
          Besoin d&apos;inspiration ?
        </h2>
        <p className="text-sm text-muted">Choisissez un exemple : le prompt, le style et le format seront préremplis.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INSPIRATIONS.map((item) => (
          <li key={item.title}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-elevated text-left shadow-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong"
            >
              <div className={`relative h-24 bg-gradient-to-br ${item.gradient}`} aria-hidden>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]" />
                <span className="absolute bottom-2.5 left-3 rounded-full bg-black/35 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                  {getStyle(item.style).label} · {ASPECT_LABELS[item.aspect].ratio}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <span className="flex items-center justify-between gap-2 font-medium">
                  {item.title}
                  <ArrowUp
                    className="h-4 w-4 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:text-accent"
                    aria-hidden
                  />
                </span>
                <span className="line-clamp-2 text-[13px] leading-snug text-muted">{item.prompt}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
