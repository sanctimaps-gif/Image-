import Link from "next/link";
import { GraduationCap, History } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLink =
  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-fg";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-lg" aria-label="VisionAI — accueil">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1" aria-label="Navigation principale">
          <Link href="/#historique" className={navLink}>
            <History className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Historique</span>
            <span className="sr-only sm:hidden">Historique</span>
          </Link>
          <Link href="/entrainement/" className={navLink}>
            <GraduationCap className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Entraînement</span>
            <span className="sr-only sm:hidden">Entraînement</span>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
