import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Studio } from "@/components/studio/Studio";
import { getGenerationService } from "@/lib/server-context";

// La configuration dépend des variables d'environnement d'exécution.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const config = getGenerationService().getConfig();
  return (
    <>
      <Header />
      <main>
        <Studio config={config} />
      </main>
      <Footer />
    </>
  );
}
