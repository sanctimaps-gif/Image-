import type { Metadata } from "next";
import { connection } from "next/server";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StaticTraining } from "@/components/static/StaticStudio";
import { TrainingApp } from "@/components/training/TrainingApp";

export const metadata: Metadata = { title: "Entraînement — VisionAI" };

const isStatic = process.env.NEXT_PUBLIC_VISIONAI_STATIC === "1";

export default async function TrainingPage() {
  let content: React.ReactNode;
  if (isStatic) {
    content = <StaticTraining />;
  } else {
    await connection();
    const { getGenerationService } = await import("@/lib/server-context");
    content = <TrainingApp config={getGenerationService().getConfig()} />;
  }
  return (
    <>
      <Header />
      <main>{content}</main>
      <Footer staticSite={isStatic} />
    </>
  );
}
