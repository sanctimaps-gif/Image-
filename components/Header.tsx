import { History } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="rounded-lg" aria-label="VisionAI — accueil">
          <Logo />
        </a>
        <nav className="flex items-center gap-1" aria-label="Navigation principale">
          <a
            href="#historique"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-fg"
          >
            <History className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Historique</span>
            <span className="sr-only sm:hidden">Historique</span>
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
