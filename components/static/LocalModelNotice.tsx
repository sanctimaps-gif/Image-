import { Cpu } from "lucide-react";

/** Explique le fonctionnement de l'IA locale avant la première génération. */
export function LocalModelNotice() {
  return (
    <section aria-labelledby="local-title" className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm sm:px-5 sm:py-4">
      <h2 id="local-title" className="mb-1 flex items-center gap-2 font-semibold text-fg">
        <Cpu className="h-4 w-4 text-accent" aria-hidden />
        IA libre, sur votre appareil
      </h2>
      <p className="text-muted">
        Ni ChatGPT, ni service d&apos;IA en ligne : le modèle libre <strong className="font-medium text-fg">Janus-Pro 1B</strong>{" "}
        (DeepSeek, licence MIT) tourne dans votre navigateur. Vos descriptions et vos images ne quittent pas l&apos;appareil.
      </p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">
        <li>
          Première utilisation : téléchargement unique du modèle (environ 1 Go, à faire en Wi-Fi), ensuite conservé par le
          navigateur.
        </li>
        <li>Nécessite WebGPU : Safari sur iOS 26 ou plus récent, ou un Chrome / Edge récent. Les appareils puissants vont plus vite.</li>
        <li>Images carrées de 384 × 384 px. Le modèle comprend mieux l&apos;anglais et écrit mal le texte sur les images.</li>
      </ul>
    </section>
  );
}
