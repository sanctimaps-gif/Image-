import { ArrowUp } from "lucide-react";
import { ASPECT_LABELS, getStyle } from "@/lib/catalog";
import { getTemplate } from "@/lib/templates";
import type { AspectId, StyleId, TemplateFields, TemplateId } from "@/types/generation";

export interface Inspiration {
  title: string;
  template: TemplateId;
  prompt: string;
  fields: TemplateFields;
  style: StyleId;
  aspect: AspectId;
  /** Dégradé décoratif : il ne s'agit pas d'une image générée. */
  gradient: string;
}

export const INSPIRATIONS: Inspiration[] = [
  {
    title: "Affiche « Rouen »",
    template: "poster",
    prompt:
      "La cathédrale de Rouen et ses flèches gothiques au coucher du soleil, quais de Seine avec maisons à colombages et pont de pierre, reflets dorés dans l'eau. À gauche, le visage de Jeanne d'Arc sculpté dans la pierre se fond dans le drapeau. Une fleur de lys en fer forgé au premier plan, feuillage sombre.",
    fields: { title: "ROUEN", subtitle: "Capitale de la Normandie", tagline: "Une ville, une histoire, une France", palette: "tricolore" },
    style: "none",
    aspect: "story",
    gradient: "from-blue-800 via-slate-100 to-red-600",
  },
  {
    title: "Affiche « La France rayonne »",
    template: "poster",
    prompt:
      "Carte de la France lumineuse au centre d'une carte du monde nocturne reliée par des arcs de lumière dorée. Dans la carte : Marianne de profil, le Louvre et sa pyramide, la tour Eiffel rayonnante, une fusée, un atome et un TGV.",
    fields: { title: "LA FRANCE", subtitle: "Rayonne", tagline: "Plus loin ensemble", palette: "or-nuit" },
    style: "none",
    aspect: "story",
    gradient: "from-indigo-950 via-amber-300 to-red-700",
  },
  {
    title: "Fiche joueur de water-polo",
    template: "character-sheet",
    prompt:
      "Joueur de water-polo de l'équipe de France, athlétique, cheveux bruns courts. Bonnet bleu marine n°9 avec protège-oreilles blancs et petit drapeau français, slip de bain bleu marine « FRANCE » avec liseré tricolore sur les hanches, ballon jaune Mikasa.",
    fields: { setting: "Piscine olympique couverte, gradins bleus, cage de but", actions: "Tir\nDéfense\nPasse\nVue arrière\nÉmergence" },
    style: "none",
    aspect: "square",
    gradient: "from-sky-500 via-blue-800 to-yellow-400",
  },
  {
    title: "Infographie « Crawl polo »",
    template: "infographic",
    prompt: "Le crawl polo, nage spécifique au water-polo : propulsion du crawl en gardant la tête hors de l'eau pour respirer et observer le jeu. Nageur au bonnet bleu marine n°7.",
    fields: {
      title: "WATER POLO – CRAWL POLO",
      subtitle: "Décomposition du mouvement",
      steps: "Position de départ\nEntrée de la main\nPhase de traction\nSortie de l'eau\nRetour du bras\nRespiration et vision",
      keyPoints: "Tête haute\nCoude haut\nMouvement continu\nJambes actives\nCoordination",
    },
    style: "none",
    aspect: "landscape",
    gradient: "from-slate-950 via-blue-900 to-cyan-400",
  },
  {
    title: "Photo football américain",
    template: "sport-photo",
    prompt:
      "Running back en pleine course, maillot noir n°12 à épaules grises, pantalon noir à bande grise, casque noir avec logo de loup blanc et grille noire, gants noirs, chaussettes blanches, ballon sous le bras.",
    fields: { setting: "Stade de nuit sous les projecteurs, tribunes pleines, pelouse synthétique" },
    style: "none",
    aspect: "portrait",
    gradient: "from-zinc-900 via-slate-600 to-zinc-300",
  },
  {
    title: "Château futuriste",
    template: "none",
    prompt:
      "Un château futuriste au sommet d'une montagne, au coucher du soleil, photographie cinématographique ultra détaillée.",
    fields: {},
    style: "cinematic",
    aspect: "landscape",
    gradient: "from-orange-300 via-rose-400 to-indigo-600",
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
        <p className="text-sm text-muted">Choisissez un exemple : le type de création, la description, les textes et le format seront préremplis.</p>
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
                  {item.template === "none" ? getStyle(item.style).label : getTemplate(item.template).label} ·{" "}
                  {ASPECT_LABELS[item.aspect].ratio}
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
