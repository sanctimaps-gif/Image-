import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-sm text-subtle">404</p>
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <Link href="/" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
