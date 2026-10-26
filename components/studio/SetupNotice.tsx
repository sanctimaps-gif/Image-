import { ExternalLink, KeyRound } from "lucide-react";

/** Affiché tant qu'aucune clé API n'est configurée : la génération est alors réellement indisponible. */
export function SetupNotice() {
  return (
    <section
      aria-labelledby="setup-title"
      className="rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm sm:p-5"
    >
      <div className="flex gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 space-y-2">
          <h2 id="setup-title" className="font-semibold text-fg">
            Génération indisponible : clé API non configurée
          </h2>
          <p className="text-muted">
            VisionAI est connecté à l&apos;API OpenAI Images, mais aucune clé n&apos;est définie sur le serveur. Aucune image ne
            sera produite tant que cette étape n&apos;est pas réalisée.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>
              Créez une clé sur{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-accent underline-offset-2 hover:underline"
              >
                platform.openai.com/api-keys
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </li>
            <li>
              Copiez <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px]">.env.example</code> vers{" "}
              <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px]">.env.local</code> et renseignez{" "}
              <code className="rounded bg-surface px-1 py-0.5 font-mono text-[12px]">OPENAI_API_KEY</code>.
            </li>
            <li>Redémarrez le serveur (<code className="font-mono text-[12px]">npm run dev</code>).</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
