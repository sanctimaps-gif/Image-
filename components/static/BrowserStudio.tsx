"use client";

import { useState } from "react";
import { BackendProvider } from "@/components/BackendProvider";
import { LocalModelNotice } from "@/components/static/LocalModelNotice";
import { Studio } from "@/components/studio/Studio";
import { BrowserEngine } from "@/lib/browser/engine";
import { createJanusWorker, LocalImageProvider } from "@/lib/local-ai/local-provider";

function createEngine(): BrowserEngine {
  const basePath = process.env.NEXT_PUBLIC_VISIONAI_BASE_PATH;
  // Le moteur ONNX Runtime est servi par le site (copié dans /ort/ par scripts/build-pages.mjs).
  const assetBase = basePath !== undefined ? `${window.location.origin}${basePath}/ort/` : null;
  return new BrowserEngine(new LocalImageProvider(createJanusWorker, assetBase));
}

/** Version en ligne (GitHub Pages) : tout se passe dans le navigateur, sans service d'IA externe. */
export default function BrowserStudio() {
  const [engine] = useState(createEngine);
  return (
    <BackendProvider backend={engine}>
      <Studio config={engine.getConfig()} renderProviderSetup={() => <LocalModelNotice />} />
    </BackendProvider>
  );
}
