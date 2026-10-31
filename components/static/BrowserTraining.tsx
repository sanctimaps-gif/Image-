"use client";

import { BackendProvider } from "@/components/BackendProvider";
import { getBrowserEngine } from "@/components/static/browser-engine";
import { TrainingApp } from "@/components/training/TrainingApp";

export default function BrowserTraining() {
  const engine = getBrowserEngine();
  return (
    <BackendProvider backend={engine}>
      <TrainingApp config={engine.getConfig()} />
    </BackendProvider>
  );
}
