const ROADMAP = [
  "Comptes utilisateurs et historique synchronisé",
  "Crédits et abonnements",
  "Amélioration automatique des prompts",
  "Édition à partir d'une image importée",
  "Partage de créations",
  "Administration et statistiques d'usage",
];

/** Fonctionnalités prévues mais non disponibles : affichées comme telles, sans bouton factice. */
export function Footer({ staticSite = false }: { staticSite?: boolean }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:px-6 md:flex-row md:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="font-medium text-fg">VisionAI</p>
          <p className="text-muted">
            {staticSite
              ? "Version en ligne : tout se passe dans votre navigateur. Images générées par OpenAI Images (avec votre clé) ou par pollinations.ai (essai gratuit), selon leurs règles d'utilisation."
              : "Images générées par l'API OpenAI Images. Les demandes sont soumises aux règles d'utilisation et de sécurité du fournisseur."}
          </p>
        </div>
        <div>
          <p className="mb-2 font-medium text-fg">
            Bientôt <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">indisponible pour l&apos;instant</span>
          </p>
          <ul className="grid gap-1 text-muted sm:grid-cols-2 sm:gap-x-8">
            {ROADMAP.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
