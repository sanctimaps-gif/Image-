import { connection } from "next/server";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BrowserStudio } from "@/components/static/BrowserStudio";
import { Studio } from "@/components/studio/Studio";

/** Version statique (GitHub Pages) : construite avec NEXT_PUBLIC_VISIONAI_STATIC=1, sans serveur. */
const isStatic = process.env.NEXT_PUBLIC_VISIONAI_STATIC === "1";

export default async function HomePage() {
  let studio: React.ReactNode;
  if (isStatic) {
    studio = <BrowserStudio />;
  } else {
    // La configuration dépend des variables d'environnement d'exécution.
    await connection();
    const { getGenerationService } = await import("@/lib/server-context");
    studio = <Studio config={getGenerationService().getConfig()} />;
  }
  return (
    <>
      <Header />
      <main>{studio}</main>
      <Footer staticSite={isStatic} />
    </>
  );
}
