"use client";

import { BackendProvider } from "@/components/BackendProvider";
import { getBrowserEngine } from "@/components/static/browser-engine";
import { LocalModelNotice } from "@/components/static/LocalModelNotice";
import { Studio } from "@/components/studio/Studio";

/** Version en ligne (GitHub Pages) : tout se passe dans le navigateur, sans service d'IA externe. */
export default function BrowserStudio() {
  const engine = getBrowserEngine();
  return (
    <BackendProvider backend={engine}>
      <Studio config={engine.getConfig()} renderProviderSetup={() => <LocalModelNotice />} />
    </BackendProvider>
  );
}
